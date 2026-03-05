"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingEngine = void 0;
const common_1 = require("@nestjs/common");
const cappe_service_1 = require("../../cappe/cappe.service");
const config_service_1 = require("../../config/config.service");
let RoutingEngine = class RoutingEngine {
    constructor(cappeService, configService) {
        this.cappeService = cappeService;
        this.configService = configService;
        // Mappa di normalizzazione: sinonimi e nomi italiani → categoria standard
        this.CATEGORY_ALIASES = {
            // Chemioterapia
            CHEMIOTERAPICI: 'CHEMOTHERAPY', CHEMIOTERAPICO: 'CHEMOTHERAPY',
            CHEMIO: 'CHEMOTHERAPY', CHEMO: 'CHEMOTHERAPY',
            ONCOLOGICI: 'CHEMOTHERAPY', ONCOLOGICO: 'CHEMOTHERAPY',
            ANTITUMORALI: 'CHEMOTHERAPY', ANTITUMORALE: 'CHEMOTHERAPY',
            CITOTOSSICI: 'CHEMOTHERAPY', CITOTOSSICO: 'CHEMOTHERAPY',
            // Immunosoppressori
            IMMUNOSOPPRESSORI: 'IMMUNOSUPPRESSANT', IMMUNOSOPPRESSORE: 'IMMUNOSUPPRESSANT',
            IMMUNOSUPPRESSANTS: 'IMMUNOSUPPRESSANT',
            // Antibiotici
            ANTIBIOTICI: 'ANTIBIOTIC', ANTIBIOTICO: 'ANTIBIOTIC',
            ANTIBIOTICS: 'ANTIBIOTIC',
            // Anticoagulanti
            ANTICOAGULANTI: 'ANTICOAGULANT', ANTICOAGULANTE: 'ANTICOAGULANT',
            ANTICOAGULANTS: 'ANTICOAGULANT',
            // Nutrizione
            NUTRIZIONE: 'NUTRITION', NUTRIZIONE_PARENTERALE: 'NUTRITION',
            NPT: 'NUTRITION', TPN: 'NUTRITION',
            // Analgesici oppioidi
            OPPIOIDI: 'ANALGESIC_OPIOID', OPPIOIDE: 'ANALGESIC_OPIOID',
            ANALGESICI: 'ANALGESIC_OPIOID', ANALGESICO: 'ANALGESIC_OPIOID',
            OPIOIDS: 'ANALGESIC_OPIOID',
            // Insulina
            INSULINE: 'INSULIN', INSULINA: 'INSULIN',
        };
    }
    route(prescription) {
        const config = this.configService.getConfig();
        const activeCappe = this.cappeService.getActiveCappe();
        if (activeCappe.length === 0) {
            throw new Error('Nessuna cappa attiva disponibile');
        }
        // --- Step 1: Valuta filtri specifici in ordine di priorità ---
        const enabledFilters = this.configService.getFilters().filter(f => f.enabled);
        for (const filter of enabledFilters) {
            if (!this.filterMatches(filter, prescription))
                continue;
            // Filtro corrisponde
            if (filter.targetCappaId) {
                const targetCappa = activeCappe.find(c => c.id === filter.targetCappaId);
                if (targetCappa) {
                    return {
                        cappaId: targetCappa.id,
                        cappaName: targetCappa.name,
                        appliedFilter: filter.name,
                        fallbackUsed: false,
                        defaultStrategy: config.defaultRoutingStrategy,
                    };
                }
                // Cappa target non attiva → fallback se configurato
                if (!filter.fallbackToDefault)
                    continue;
            }
            // targetCappaId nullo o fallback: usa default strategy
            const best = this.applyStrategy(config.defaultRoutingStrategy, prescription, activeCappe);
            return {
                cappaId: best.id,
                cappaName: best.name,
                appliedFilter: filter.name,
                fallbackUsed: filter.targetCappaId != null,
                defaultStrategy: config.defaultRoutingStrategy,
            };
        }
        // --- Step 2: Nessun filtro corrisponde → default strategy ---
        const best = this.applyStrategy(config.defaultRoutingStrategy, prescription, activeCappe);
        return {
            cappaId: best.id,
            cappaName: best.name,
            appliedFilter: null,
            fallbackUsed: false,
            defaultStrategy: config.defaultRoutingStrategy,
        };
    }
    filterMatches(filter, p) {
        const { conditions } = filter;
        let matched = false;
        let hasCondition = false;
        if (conditions.drugCategories?.length) {
            hasCondition = true;
            if (conditions.drugCategories.includes(p.drug.category))
                matched = true;
        }
        if (conditions.ward) {
            hasCondition = true;
            if (p.patient.ward.toLowerCase().includes(conditions.ward.toLowerCase()))
                matched = true;
        }
        if (conditions.urgency) {
            hasCondition = true;
            if (p.priority === conditions.urgency)
                matched = true;
        }
        // Se non ha condizioni, non corrisponde a nulla
        if (!hasCondition)
            return false;
        // Per condizioni multiple: tutte devono corrispondere (AND logic)
        let allMatch = true;
        if (conditions.drugCategories?.length && !conditions.drugCategories.includes(p.drug.category))
            allMatch = false;
        if (conditions.ward && !p.patient.ward.toLowerCase().includes(conditions.ward.toLowerCase()))
            allMatch = false;
        if (conditions.urgency && p.priority !== conditions.urgency)
            allMatch = false;
        return allMatch;
    }
    applyStrategy(strategy, prescription, active) {
        switch (strategy) {
            case 'load_balance':
                return this.strategyLoadBalance(active);
            case 'drug_type':
                return this.strategyDrugType(prescription, active);
            case 'urgency_first':
                return this.strategyUrgencyFirst(prescription, active);
            case 'ward':
                return this.strategyWard(prescription, active);
            default:
                return this.strategyLoadBalance(active);
        }
    }
    // Normalizza una stringa di specializzazione alla categoria standard
    normalizeCategory(spec) {
        const upper = (spec || '').toUpperCase().trim();
        return this.CATEGORY_ALIASES[upper] ?? upper;
    }
    // Cappa con meno lavoro in coda (tra quelle passate)
    strategyLoadBalance(active) {
        return active.reduce((best, c) => {
            return this.cappeService.getQueueLength(c.id) < this.cappeService.getQueueLength(best.id) ? c : best;
        });
    }
    // Cappa specializzata per categoria farmaco, con load-balance tra più match
    strategyDrugType(prescription, active) {
        const category = prescription.drug.category.toUpperCase();
        const specialized = active.filter(c => c.specializations?.some((s) => this.normalizeCategory(s) === category));
        // Se ci sono cappe specializzate, prende quella con la coda più corta
        if (specialized.length > 0)
            return this.strategyLoadBalance(specialized);
        // Nessuna cappa specializzata → load balance su tutte
        return this.strategyLoadBalance(active);
    }
    // STAT → cappa più libera tra quelle specializzate, poi tutte
    strategyUrgencyFirst(prescription, active) {
        if (prescription.priority === 'STAT' || prescription.priority === 'URGENT') {
            return this.strategyDrugType(prescription, active);
        }
        return this.strategyLoadBalance(active);
    }
    // Cappa assegnata al reparto tramite specializzazione
    strategyWard(prescription, active) {
        const ward = prescription.patient.ward.toUpperCase();
        const wardCappa = active.filter(c => c.specializations?.some((s) => ward.includes(s.toUpperCase())));
        if (wardCappa.length > 0)
            return this.strategyLoadBalance(wardCappa);
        return this.strategyLoadBalance(active);
    }
};
exports.RoutingEngine = RoutingEngine;
exports.RoutingEngine = RoutingEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cappe_service_1.CappeService,
        config_service_1.ConfigService])
], RoutingEngine);
