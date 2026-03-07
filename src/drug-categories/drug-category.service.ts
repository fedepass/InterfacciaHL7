import { Injectable, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrugCategoryEntity } from '../database/entities/drug-category.entity';
import { DrugCategoryAliasEntity } from '../database/entities/drug-category-alias.entity';
import { DrugCategoryAtcEntity } from '../database/entities/drug-category-atc.entity';
import { AtcLevel1Entity } from '../database/entities/atc-level1.entity';
import { AtcLevel2Entity } from '../database/entities/atc-level2.entity';

export interface AtcLevel1Dto {
  code: string;
  nameEn: string;
  nameIt: string;
  subgroups: AtcLevel2Dto[];
}

export interface AtcLevel2Dto {
  code: string;
  nameEn: string;
  nameIt: string;
  level1Code: string;
  level1NameIt: string;
  level1NameEn: string;
  /** Presente solo quando il DTO è restituito come parte di DrugCategory.atcCodes */
  mappingId?: number;
}

export interface DrugCategory {
  code: string;
  label: string;
  description?: string;
  active: boolean;
  aliases: DrugCategoryAlias[];
  atcCodes: AtcLevel2Dto[];
}

export interface DrugCategoryAlias {
  id: number;
  alias: string;
  categoryCode: string;
  language: string;
}

@Injectable()
export class DrugCategoryService implements OnModuleInit {
  // Cache in-memory: alias UPPERCASE → category code
  private aliasMap: Map<string, string> = new Map();
  private categories: DrugCategory[] = [];

  constructor(
    @InjectRepository(DrugCategoryEntity)
    private readonly categoryRepo: Repository<DrugCategoryEntity>,
    @InjectRepository(DrugCategoryAliasEntity)
    private readonly aliasRepo: Repository<DrugCategoryAliasEntity>,
    @InjectRepository(DrugCategoryAtcEntity)
    private readonly catAtcRepo: Repository<DrugCategoryAtcEntity>,
    @InjectRepository(AtcLevel1Entity)
    private readonly atcL1Repo: Repository<AtcLevel1Entity>,
    @InjectRepository(AtcLevel2Entity)
    private readonly atcL2Repo: Repository<AtcLevel2Entity>,
  ) {}

  async onModuleInit() {
    try {
      await this.reloadCache();
    } catch (e) {
      console.error('DrugCategoryService: impossibile caricare dal DB, uso mappa vuota:', e.message);
    }
  }

  private async reloadCache() {
    const entities = await this.categoryRepo.find({ order: { code: 'ASC' } });
    this.categories = entities.map((e) => this.toDto(e));
    this.aliasMap = new Map();
    for (const cat of entities) {
      // La categoria stessa è un alias di se stessa
      this.aliasMap.set(cat.code.toUpperCase(), cat.code);
      for (const a of cat.aliases ?? []) {
        this.aliasMap.set(a.alias.toUpperCase(), cat.code);
      }
    }
  }

  // ── Lettura ───────────────────────────────────────────────────

  getCategories(): DrugCategory[] {
    return this.categories;
  }

  getCategory(code: string): DrugCategory | null {
    return this.categories.find((c) => c.code === code.toUpperCase()) ?? null;
  }

  /** Normalizza un alias/sinonimo alla categoria standard (sync, da cache) */
  normalizeCategory(spec: string): string {
    const upper = (spec ?? '').toUpperCase().trim();
    return this.aliasMap.get(upper) ?? upper;
  }

  // ── CRUD Categorie ────────────────────────────────────────────

  async addCategory(dto: { code: string; label: string; description?: string }): Promise<DrugCategory> {
    const code = dto.code.toUpperCase().trim();
    const existing = await this.categoryRepo.findOne({ where: { code } });
    if (existing) throw new ConflictException(`Categoria '${code}' già esistente`);
    const entity = await this.categoryRepo.save({ code, label: dto.label, description: dto.description ?? null, active: true });
    await this.reloadCache();
    return this.toDto(entity);
  }

  async updateCategory(code: string, dto: { label?: string; description?: string; active?: boolean }): Promise<DrugCategory> {
    const entity = await this.categoryRepo.findOne({ where: { code: code.toUpperCase() } });
    if (!entity) throw new NotFoundException(`Categoria '${code}' non trovata`);
    if (dto.label !== undefined) entity.label = dto.label;
    if (dto.description !== undefined) entity.description = dto.description;
    if (dto.active !== undefined) entity.active = dto.active;
    await this.categoryRepo.save(entity);
    await this.reloadCache();
    return this.toDto(entity);
  }

  async removeCategory(code: string): Promise<void> {
    const result = await this.categoryRepo.delete({ code: code.toUpperCase() });
    if (result.affected === 0) throw new NotFoundException(`Categoria '${code}' non trovata`);
    await this.reloadCache();
  }

  // ── ATC: lettura gerarchia ────────────────────────────────────

  async getAtcHierarchy(): Promise<AtcLevel1Dto[]> {
    const l1 = await this.atcL1Repo.find({ order: { code: 'ASC' } });
    const l2 = await this.atcL2Repo.find({ order: { code: 'ASC' } });
    return l1.map((g) => ({
      code: g.code,
      nameEn: g.nameEn,
      nameIt: g.nameIt,
      subgroups: l2
        .filter((s) => s.level1Code === g.code)
        .map((s) => this.atcL2ToDto(s)),
    }));
  }

  async getAtcLevel2(): Promise<AtcLevel2Dto[]> {
    const all = await this.atcL2Repo.find({ order: { code: 'ASC' } });
    return all.map((e) => this.atcL2ToDto(e));
  }

  // ── ATC: associazioni categoria ↔ codice ATC ──────────────────

  async addAtcMapping(categoryCode: string, atcCode: string): Promise<void> {
    const code = categoryCode.toUpperCase().trim();
    const atc  = atcCode.toUpperCase().trim();
    const category = await this.categoryRepo.findOne({ where: { code } });
    if (!category) throw new NotFoundException(`Categoria '${code}' non trovata`);
    const atcEntity = await this.atcL2Repo.findOne({ where: { code: atc } });
    if (!atcEntity) throw new NotFoundException(`Codice ATC '${atc}' non trovato`);
    const existing = await this.catAtcRepo.findOne({ where: { drugCategoryCode: code, atcCode: atc } });
    if (existing) throw new ConflictException(`Associazione '${code}' → '${atc}' già esistente`);
    await this.catAtcRepo.save({ drugCategoryCode: code, atcCode: atc });
    await this.reloadCache();
  }

  async removeAtcMapping(id: number): Promise<void> {
    const result = await this.catAtcRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Associazione ATC id ${id} non trovata`);
    await this.reloadCache();
  }

  // ── CRUD Alias ────────────────────────────────────────────────

  async addAlias(categoryCode: string, dto: { alias: string; language?: string }): Promise<DrugCategoryAlias> {
    const code = categoryCode.toUpperCase().trim();
    const category = await this.categoryRepo.findOne({ where: { code } });
    if (!category) throw new NotFoundException(`Categoria '${code}' non trovata`);
    const alias = dto.alias.toUpperCase().trim();
    const existing = await this.aliasRepo.findOne({ where: { alias } });
    if (existing) throw new ConflictException(`Alias '${alias}' già esistente`);
    const entity = await this.aliasRepo.save({ alias, categoryCode: code, language: (dto.language ?? 'IT').toUpperCase() });
    await this.reloadCache();
    return this.aliasToDto(entity);
  }

  async removeAlias(id: number): Promise<void> {
    const result = await this.aliasRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Alias con id ${id} non trovato`);
    await this.reloadCache();
  }

  // ── Conversioni ───────────────────────────────────────────────

  private toDto(e: DrugCategoryEntity): DrugCategory {
    return {
      code: e.code,
      label: e.label,
      description: e.description ?? undefined,
      active: e.active,
      aliases: (e.aliases ?? []).map((a) => this.aliasToDto(a)),
      atcCodes: (e.atcMappings ?? [])
        .filter((m) => m.atcCategory)
        .map((m) => ({ ...this.atcL2ToDto(m.atcCategory), mappingId: m.id })),
    };
  }

  private aliasToDto(e: DrugCategoryAliasEntity): DrugCategoryAlias {
    return { id: e.id, alias: e.alias, categoryCode: e.categoryCode, language: e.language };
  }

  private atcL2ToDto(e: AtcLevel2Entity): AtcLevel2Dto {
    return {
      code: e.code,
      nameEn: e.nameEn,
      nameIt: e.nameIt,
      level1Code: e.level1Code,
      level1NameIt: e.level1?.nameIt ?? '',
      level1NameEn: e.level1?.nameEn ?? '',
    };
  }
}
