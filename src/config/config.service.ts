import { Injectable, OnModuleInit } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs-extra';
import * as path from 'path';

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

export interface OutputFieldDef {
  fieldPath: string;
  label: string;
  groupName: string;
  description: string | null;
  required: boolean;
  sortOrder: number;
}

export interface AppConfig {
  filters: RoutingFilter[];
  outputFields: string[] | null;
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  filters: [],
  outputFields: null,
};

const STATIC_CATALOG: OutputFieldDef[] = [
  { fieldPath: 'prescriptionId',          label: 'ID Prescrizione',    groupName: 'Generale',     description: null, required: true,  sortOrder: 1  },
  { fieldPath: 'status',                  label: 'Stato',              groupName: 'Generale',     description: null, required: true,  sortOrder: 2  },
  { fieldPath: 'priority',               label: 'Priorità',           groupName: 'Generale',     description: null, required: false, sortOrder: 3  },
  { fieldPath: 'deliveryStatus',         label: 'Stato Consegna',     groupName: 'Generale',     description: null, required: false, sortOrder: 4  },
  { fieldPath: 'patient.id',             label: 'ID Paziente',        groupName: 'Paziente',     description: null, required: true,  sortOrder: 5  },
  { fieldPath: 'patient.ward',           label: 'Reparto',            groupName: 'Paziente',     description: null, required: false, sortOrder: 6  },
  { fieldPath: 'preparation.drug',       label: 'Farmaco',            groupName: 'Preparazione', description: null, required: true,  sortOrder: 7  },
  { fieldPath: 'preparation.category',   label: 'Categoria',          groupName: 'Preparazione', description: null, required: false, sortOrder: 8  },
  { fieldPath: 'preparation.code',       label: 'Codice',             groupName: 'Preparazione', description: null, required: false, sortOrder: 9  },
  { fieldPath: 'preparation.dosage',     label: 'Dosaggio',           groupName: 'Preparazione', description: null, required: false, sortOrder: 10 },
  { fieldPath: 'preparation.dosageValue',label: 'Valore Dosaggio',    groupName: 'Preparazione', description: null, required: false, sortOrder: 11 },
  { fieldPath: 'preparation.dosageUnit', label: 'Unità Dosaggio',     groupName: 'Preparazione', description: null, required: false, sortOrder: 12 },
  { fieldPath: 'preparation.solvent',    label: 'Solvente',           groupName: 'Preparazione', description: null, required: false, sortOrder: 13 },
  { fieldPath: 'preparation.volume',     label: 'Volume',             groupName: 'Preparazione', description: null, required: false, sortOrder: 14 },
  { fieldPath: 'preparation.volumeValue',label: 'Valore Volume',      groupName: 'Preparazione', description: null, required: false, sortOrder: 15 },
  { fieldPath: 'preparation.volumeUnit', label: 'Unità Volume',       groupName: 'Preparazione', description: null, required: false, sortOrder: 16 },
  { fieldPath: 'timestamps.received',    label: 'Ricevuto',           groupName: 'Timestamp',    description: null, required: false, sortOrder: 17 },
  { fieldPath: 'timestamps.dispatched',  label: 'Inviato',            groupName: 'Timestamp',    description: null, required: false, sortOrder: 18 },
  { fieldPath: 'timestamps.requiredBy',  label: 'Richiesto Entro',    groupName: 'Timestamp',    description: null, required: false, sortOrder: 19 },
  { fieldPath: 'timestamps.sentToApi',   label: 'Inviato ad API',     groupName: 'Timestamp',    description: null, required: false, sortOrder: 20 },
];

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: AppConfig = { ...DEFAULT_CONFIG };

  async onModuleInit() {
    try {
      await this.loadFromFile();
    } catch (e) {
      console.error('Impossibile caricare configurazione dal file, uso defaults:', e.message);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private async loadFromFile(): Promise<void> {
    if (!(await fs.pathExists(CONFIG_PATH))) {
      this.config = { ...DEFAULT_CONFIG };
      return;
    }
    const raw = await fs.readJson(CONFIG_PATH);
    this.config = {
      filters: raw.filters ?? [],
      outputFields: raw.outputFields ?? null,
    };
  }

  private async saveToFile(): Promise<void> {
    await fs.ensureDir(path.dirname(CONFIG_PATH));
    const existing = (await fs.pathExists(CONFIG_PATH)) ? await fs.readJson(CONFIG_PATH) : {};
    await fs.writeJson(CONFIG_PATH, { ...existing, filters: this.config.filters, outputFields: this.config.outputFields }, { spaces: 2 });
  }

  // ── Catalogo ─────────────────────────────────────────────────────────────

  getCatalog(): OutputFieldDef[] {
    return STATIC_CATALOG;
  }

  // ── Lettura ────────────────────────────────────────────────────────────────

  getFilters(): RoutingFilter[] {
    return [...this.config.filters].sort((a, b) => a.priority - b.priority);
  }

  getOutputFields(): string[] | null {
    return this.config.outputFields ?? null;
  }

  // ── Output fields ──────────────────────────────────────────────────────────

  async setOutputFields(fields: string[] | null): Promise<void> {
    this.config.outputFields = fields;
    await this.saveToFile();
  }

  // ── Filtri ─────────────────────────────────────────────────────────────────

  addFilter(dto: Omit<RoutingFilter, 'id'>): RoutingFilter {
    const filter: RoutingFilter = { id: uuidv4(), ...dto };
    this.config.filters.push(filter);
    this.saveToFile().catch((e) => console.error('Errore salvataggio filtro:', e.message));
    return filter;
  }

  updateFilter(id: string, dto: Partial<Omit<RoutingFilter, 'id'>>): RoutingFilter | null {
    const idx = this.config.filters.findIndex((f) => f.id === id);
    if (idx === -1) return null;
    this.config.filters[idx] = { ...this.config.filters[idx], ...dto };
    const updated = this.config.filters[idx];
    this.saveToFile().catch((e) => console.error('Errore aggiornamento filtro:', e.message));
    return updated;
  }

  removeFilter(id: string): boolean {
    const before = this.config.filters.length;
    this.config.filters = this.config.filters.filter((f) => f.id !== id);
    if (this.config.filters.length < before) {
      this.saveToFile().catch((e) => console.error('Errore rimozione filtro:', e.message));
      return true;
    }
    return false;
  }

  // ── Output field filtering ─────────────────────────────────────────────────

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
}
