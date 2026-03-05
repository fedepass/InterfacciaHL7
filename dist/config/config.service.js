"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');
const DEFAULT_CONFIG = {
    defaultRoutingStrategy: 'drug_type',
    filters: [],
    cappe: [],
    outputFields: null,
};
let ConfigService = class ConfigService {
    constructor() {
        this.config = DEFAULT_CONFIG;
    }
    onModuleInit() {
        this.load();
    }
    load() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                this.config = fs.readJsonSync(CONFIG_PATH);
            }
            else {
                fs.ensureDirSync(path.dirname(CONFIG_PATH));
                this.save();
            }
        }
        catch (e) {
            console.error('Errore caricamento config:', e.message);
            this.config = { ...DEFAULT_CONFIG };
        }
    }
    save() {
        fs.writeJsonSync(CONFIG_PATH, this.config, { spaces: 2 });
    }
    getConfig() {
        return this.config;
    }
    setDefaultStrategy(strategy) {
        this.config.defaultRoutingStrategy = strategy;
        this.save();
    }
    // Filtri
    getFilters() {
        return [...this.config.filters].sort((a, b) => a.priority - b.priority);
    }
    addFilter(dto) {
        const filter = { id: (0, uuid_1.v4)(), ...dto };
        this.config.filters.push(filter);
        this.save();
        return filter;
    }
    updateFilter(id, dto) {
        const idx = this.config.filters.findIndex(f => f.id === id);
        if (idx === -1)
            return null;
        this.config.filters[idx] = { ...this.config.filters[idx], ...dto };
        this.save();
        return this.config.filters[idx];
    }
    removeFilter(id) {
        const before = this.config.filters.length;
        this.config.filters = this.config.filters.filter(f => f.id !== id);
        if (this.config.filters.length < before) {
            this.save();
            return true;
        }
        return false;
    }
    // Cappe
    getCappe() {
        return this.config.cappe;
    }
    addCappa(cappa) {
        this.config.cappe.push(cappa);
        this.save();
    }
    updateCappa(id, cappa) {
        const idx = this.config.cappe.findIndex(c => c.id === id);
        if (idx !== -1) {
            this.config.cappe[idx] = cappa;
            this.save();
        }
    }
    removeCappa(id) {
        this.config.cappe = this.config.cappe.filter(c => c.id !== id);
        this.save();
    }
    // Output field filtering
    getOutputFields() {
        return this.config.outputFields ?? null;
    }
    setOutputFields(fields) {
        this.config.outputFields = fields;
        this.save();
    }
    /**
     * Filtra un oggetto DispatchResult mantenendo solo i campi abilitati.
     * Supporta percorsi dot-notation (es. "patient.name", "preparation.drug").
     * Se outputFields è null → restituisce l'oggetto intatto.
     */
    applyOutputFilter(result) {
        const fields = this.getOutputFields();
        if (!fields || fields.length === 0)
            return result;
        const enabled = new Set(fields);
        const out = {};
        for (const key of Object.keys(result)) {
            const val = result[key];
            if (val === null || val === undefined)
                continue;
            if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                // Oggetto annidato: includi solo i sotto-campi abilitati
                const nested = {};
                for (const subKey of Object.keys(val)) {
                    if (enabled.has(`${key}.${subKey}`))
                        nested[subKey] = val[subKey];
                }
                if (Object.keys(nested).length > 0)
                    out[key] = nested;
            }
            else {
                // Valore semplice: includi se il percorso è abilitato
                if (enabled.has(key))
                    out[key] = val;
            }
        }
        return out;
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)()
], ConfigService);
