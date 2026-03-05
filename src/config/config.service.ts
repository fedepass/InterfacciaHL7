import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CappaEntity } from '../database/entities/cappa.entity';
import { CappaSpecEntity } from '../database/entities/cappa-spec.entity';
import { RoutingFilterEntity } from '../database/entities/routing-filter.entity';
import { AppConfigEntity } from '../database/entities/app-config.entity';

export type DefaultStrategy = 'load_balance' | 'drug_type' | 'urgency_first' | 'ward';

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
  targetCappaId: string | null;
  fallbackToDefault: boolean;
}

export type CappaType =
  | 'FLUSSO_LAMINARE_VERTICALE'
  | 'FLUSSO_LAMINARE_ORIZZONTALE'
  | 'ISOLATORE'
  | 'BSC'
  | 'CHIMICA'
  | 'DISPENSAZIONE'
  | 'ALTRO';

export type CappaStatus = 'ONLINE' | 'OFFLINE' | 'MANUTENZIONE' | 'GUASTO';

export interface CappaConfig {
  id: string;
  name: string;
  description?: string;
  type: CappaType;
  active: boolean;
  status: CappaStatus;
  maxQueueSize: number;
  specializations: string[];
}

export interface AppConfig {
  defaultRoutingStrategy: DefaultStrategy;
  filters: RoutingFilter[];
  cappe: CappaConfig[];
  outputFields: string[] | null;
}

const DEFAULT_CONFIG: AppConfig = {
  defaultRoutingStrategy: 'drug_type',
  filters: [],
  cappe: [],
  outputFields: null,
};

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: AppConfig = { ...DEFAULT_CONFIG };

  constructor(
    @InjectRepository(CappaEntity)
    private readonly cappaRepo: Repository<CappaEntity>,
    @InjectRepository(CappaSpecEntity)
    private readonly cappaSpecRepo: Repository<CappaSpecEntity>,
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
    const [cappeEntities, filterEntities, appConfigEntity] = await Promise.all([
      this.cappaRepo.find({ relations: ['specs'] }),
      this.filterRepo.find({ order: { priority: 'ASC' } }),
      this.appConfigRepo.findOne({ where: { id: 1 } }),
    ]);

    // Inizializza app_config se non esiste
    if (!appConfigEntity) {
      await this.appConfigRepo.save({ id: 1, defaultRoutingStrategy: DEFAULT_CONFIG.defaultRoutingStrategy, outputFields: null });
    }

    this.config = {
      defaultRoutingStrategy: (appConfigEntity?.defaultRoutingStrategy ?? DEFAULT_CONFIG.defaultRoutingStrategy) as DefaultStrategy,
      outputFields: appConfigEntity?.outputFields ?? null,
      cappe: cappeEntities.map((e) => this.entityToCappaConfig(e)),
      filters: filterEntities.map((e) => this.entityToFilter(e)),
    };
  }

  // ── Lettura (sincrona, dalla cache) ──────────────────────────

  getConfig(): AppConfig {
    return this.config;
  }

  getFilters(): RoutingFilter[] {
    return [...this.config.filters].sort((a, b) => a.priority - b.priority);
  }

  getCappe(): CappaConfig[] {
    return this.config.cappe;
  }

  getOutputFields(): string[] | null {
    return this.config.outputFields ?? null;
  }

  // ── Strategia ───────────────────────────────────────────────

  setDefaultStrategy(strategy: DefaultStrategy) {
    this.config.defaultRoutingStrategy = strategy;
    this.appConfigRepo
      .save({ id: 1, defaultRoutingStrategy: strategy, outputFields: this.config.outputFields })
      .catch((e) => console.error('DB error setDefaultStrategy:', e.message));
  }

  // ── Output fields ────────────────────────────────────────────

  setOutputFields(fields: string[] | null) {
    this.config.outputFields = fields;
    this.appConfigRepo
      .save({ id: 1, defaultRoutingStrategy: this.config.defaultRoutingStrategy, outputFields: fields })
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

  // ── Cappe ────────────────────────────────────────────────────

  addCappa(cappa: CappaConfig) {
    this.config.cappe.push(cappa);
    this.persistCappa(cappa).catch((e) => console.error('DB error addCappa:', e.message));
  }

  updateCappa(id: string, cappa: CappaConfig) {
    const idx = this.config.cappe.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.config.cappe[idx] = cappa;
      this.persistCappa(cappa).catch((e) => console.error('DB error updateCappa:', e.message));
    }
  }

  removeCappa(id: string) {
    this.config.cappe = this.config.cappe.filter((c) => c.id !== id);
    this.cappaRepo
      .delete(id)
      .catch((e) => console.error('DB error removeCappa:', e.message));
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

  private entityToCappaConfig(e: CappaEntity): CappaConfig {
    return {
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      type: e.type as CappaType,
      active: e.active,
      status: e.status as CappaStatus,
      maxQueueSize: e.maxQueueSize,
      specializations: e.specs?.map((s) => s.specialization) ?? [],
    };
  }

  private async persistCappa(cappa: CappaConfig): Promise<void> {
    await this.cappaRepo.save({
      id: cappa.id,
      name: cappa.name,
      description: cappa.description ?? null,
      type: cappa.type,
      active: cappa.active,
      status: cappa.status,
      maxQueueSize: cappa.maxQueueSize,
    });
    // Aggiorna specializzazioni: elimina le vecchie e inserisce le nuove
    await this.cappaSpecRepo.delete({ cappaId: cappa.id });
    if (cappa.specializations.length > 0) {
      await this.cappaSpecRepo.insert(
        cappa.specializations.map((s) => ({ cappaId: cappa.id, specialization: s })),
      );
    }
  }

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
      targetCappaId: e.targetCappaId ?? null,
      fallbackToDefault: e.fallbackToDefault,
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
      targetCappaId: f.targetCappaId ?? null,
      fallbackToDefault: f.fallbackToDefault,
    };
  }
}
