import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RoutingFilterEntity } from '../database/entities/routing-filter.entity';
import { AppConfigEntity } from '../database/entities/app-config.entity';

export interface FilterConditions {
  drugCategories?: string[] | null;
  ward?: string | null;
  urgency?: 'STAT' | 'URGENT' | null;
}

export interface RoutingFilter {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: FilterConditions;
}

export interface AppConfig {
  filters: RoutingFilter[];
  outputFields: string[] | null;
}

const DEFAULT_CONFIG: AppConfig = {
  filters: [],
  outputFields: null,
};

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: AppConfig = { ...DEFAULT_CONFIG };

  constructor(
    @InjectRepository(RoutingFilterEntity)
    private readonly filterRepo: Repository<RoutingFilterEntity>,
    @InjectRepository(AppConfigEntity)
    private readonly appConfigRepo: Repository<AppConfigEntity>,
  ) {}

  async onModuleInit() {
    try {
      await this.loadFromDb();
    } catch (e) {
      console.error('Impossibile caricare configurazione dal DB, uso defaults:', e.message);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private async loadFromDb() {
    const [filterEntities, appConfigEntity] = await Promise.all([
      this.filterRepo.find({ order: { priority: 'ASC' } }),
      this.appConfigRepo.findOne({ where: { id: 1 } }),
    ]);

    if (!appConfigEntity) {
      await this.appConfigRepo.save({ id: 1, outputFields: null });
    }

    this.config = {
      outputFields: appConfigEntity?.outputFields ?? null,
      filters: filterEntities.map((e) => this.entityToFilter(e)),
    };
  }

  // ── Lettura ────────────────────────────────────────────────────

  getFilters(): RoutingFilter[] {
    return [...this.config.filters].sort((a, b) => a.priority - b.priority);
  }

  getOutputFields(): string[] | null {
    return this.config.outputFields ?? null;
  }

  // ── Output fields ────────────────────────────────────────────

  setOutputFields(fields: string[] | null) {
    this.config.outputFields = fields;
    this.appConfigRepo
      .save({ id: 1, outputFields: fields })
      .catch((e) => console.error('DB error setOutputFields:', e.message));
  }

  // ── Filtri ───────────────────────────────────────────────────

  addFilter(dto: Omit<RoutingFilter, 'id'>): RoutingFilter {
    const filter: RoutingFilter = { id: uuidv4(), ...dto };
    this.config.filters.push(filter);
    this.filterRepo
      .save(this.filterToEntity(filter))
      .catch((e) => console.error('DB error addFilter:', e.message));
    return filter;
  }

  updateFilter(id: string, dto: Partial<Omit<RoutingFilter, 'id'>>): RoutingFilter | null {
    const idx = this.config.filters.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.config.filters[idx] = { ...this.config.filters[idx], ...dto };
    const updated = this.config.filters[idx];
    this.filterRepo
      .save(this.filterToEntity(updated))
      .catch((e) => console.error('DB error updateFilter:', e.message));
    return updated;
  }

  removeFilter(id: string): boolean {
    const before = this.config.filters.length;
    this.config.filters = this.config.filters.filter((f) => f.id !== id);
    if (this.config.filters.length < before) {
      this.filterRepo
        .delete(id)
        .catch((e) => console.error('DB error removeFilter:', e.message));
      return true;
    }
    return false;
  }

  // ── Output field filtering ───────────────────────────────────

  applyOutputFilter(result: Record<string, any>): Record<string, any> {
    const fields = this.getOutputFields();
    if (!fields || fields.length === 0) return result;

    const enabled = new Set(fields);
    const out: Record<string, any> = {};

    for (const key of Object.keys(result)) {
      const val = result[key];
      if (val === null || val === undefined) continue;

      if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        const nested: Record<string, any> = {};
        for (const subKey of Object.keys(val)) {
          if (enabled.has(`${key}.${subKey}`)) nested[subKey] = val[subKey];
        }
        if (Object.keys(nested).length > 0) out[key] = nested;
      } else {
        if (enabled.has(key)) out[key] = val;
      }
    }
    return out;
  }

  // ── Conversioni entity ↔ interfacce ─────────────────────────

  private entityToFilter(e: RoutingFilterEntity): RoutingFilter {
    return {
      id: e.id,
      name: e.name,
      enabled: e.enabled,
      priority: e.priority,
      conditions: {
        drugCategories: e.conditionDrugCats ?? null,
        ward: e.conditionWard ?? null,
        urgency: e.conditionUrgency ?? null,
      },
    };
  }

  private filterToEntity(f: RoutingFilter): Partial<RoutingFilterEntity> {
    return {
      id: f.id,
      name: f.name,
      enabled: f.enabled,
      priority: f.priority,
      conditionDrugCats: f.conditions.drugCategories ?? null,
      conditionWard: f.conditions.ward ?? null,
      conditionUrgency: f.conditions.urgency ?? null,
    };
  }
}
