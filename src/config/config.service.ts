import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

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
  | 'FLUSSO_LAMINARE_VERTICALE'    // BSC Classe II verticale – citotossici/biologici
  | 'FLUSSO_LAMINARE_ORIZZONTALE'  // Flusso laminare orizzontale – sterili non tossici
  | 'ISOLATORE'                    // Isolatore a pressione pos./neg. – alto rischio
  | 'BSC'                          // Biological Safety Cabinet
  | 'CHIMICA'                      // Cappa chimica con carbone attivo – solventi
  | 'DISPENSAZIONE'                // Postazione dispensazione – preparazioni non sterili
  | 'ALTRO';

export type CappaStatus = 'ONLINE' | 'OFFLINE' | 'MANUTENZIONE' | 'GUASTO';

export interface CappaConfig {
  id: string;
  name: string;
  description?: string;
  type: CappaType;
  active: boolean;
  status: CappaStatus;
  maxQueueSize: number;   // 0 = illimitata
  specializations: string[];
}

export interface AppConfig {
  defaultRoutingStrategy: DefaultStrategy;
  filters: RoutingFilter[];
  cappe: CappaConfig[];
  outputFields: string[] | null; // null = tutti i campi abilitati
}

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_CONFIG: AppConfig = {
  defaultRoutingStrategy: 'drug_type',
  filters: [],
  cappe: [],
  outputFields: null,
};

@Injectable()
export class ConfigService implements OnModuleInit {
  private config: AppConfig = DEFAULT_CONFIG;

  onModuleInit() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        this.config = fs.readJsonSync(CONFIG_PATH);
      } else {
        fs.ensureDirSync(path.dirname(CONFIG_PATH));
        this.save();
      }
    } catch (e) {
      console.error('Errore caricamento config:', e.message);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  private save() {
    fs.writeJsonSync(CONFIG_PATH, this.config, { spaces: 2 });
  }

  getConfig(): AppConfig {
    return this.config;
  }

  setDefaultStrategy(strategy: DefaultStrategy) {
    this.config.defaultRoutingStrategy = strategy;
    this.save();
  }

  // Filtri
  getFilters(): RoutingFilter[] {
    return [...this.config.filters].sort((a, b) => a.priority - b.priority);
  }

  addFilter(dto: Omit<RoutingFilter, 'id'>): RoutingFilter {
    const filter: RoutingFilter = { id: uuidv4(), ...dto };
    this.config.filters.push(filter);
    this.save();
    return filter;
  }

  updateFilter(id: string, dto: Partial<Omit<RoutingFilter, 'id'>>): RoutingFilter | null {
    const idx = this.config.filters.findIndex(f => f.id === id);
    if (idx === -1) return null;
    this.config.filters[idx] = { ...this.config.filters[idx], ...dto };
    this.save();
    return this.config.filters[idx];
  }

  removeFilter(id: string): boolean {
    const before = this.config.filters.length;
    this.config.filters = this.config.filters.filter(f => f.id !== id);
    if (this.config.filters.length < before) { this.save(); return true; }
    return false;
  }

  // Cappe
  getCappe(): CappaConfig[] {
    return this.config.cappe;
  }

  addCappa(cappa: CappaConfig) {
    this.config.cappe.push(cappa);
    this.save();
  }

  updateCappa(id: string, cappa: CappaConfig) {
    const idx = this.config.cappe.findIndex(c => c.id === id);
    if (idx !== -1) { this.config.cappe[idx] = cappa; this.save(); }
  }

  removeCappa(id: string) {
    this.config.cappe = this.config.cappe.filter(c => c.id !== id);
    this.save();
  }

  // Output field filtering
  getOutputFields(): string[] | null {
    return this.config.outputFields ?? null;
  }

  setOutputFields(fields: string[] | null) {
    this.config.outputFields = fields;
    this.save();
  }

  /**
   * Filtra un oggetto DispatchResult mantenendo solo i campi abilitati.
   * Supporta percorsi dot-notation (es. "patient.name", "preparation.drug").
   * Se outputFields è null → restituisce l'oggetto intatto.
   */
  applyOutputFilter(result: Record<string, any>): Record<string, any> {
    const fields = this.getOutputFields();
    if (!fields || fields.length === 0) return result;

    const enabled = new Set(fields);
    const out: Record<string, any> = {};

    for (const key of Object.keys(result)) {
      const val = result[key];
      if (val === null || val === undefined) continue;

      if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        // Oggetto annidato: includi solo i sotto-campi abilitati
        const nested: Record<string, any> = {};
        for (const subKey of Object.keys(val)) {
          if (enabled.has(`${key}.${subKey}`)) nested[subKey] = val[subKey];
        }
        if (Object.keys(nested).length > 0) out[key] = nested;
      } else {
        // Valore semplice: includi se il percorso è abilitato
        if (enabled.has(key)) out[key] = val;
      }
    }
    return out;
  }
}
