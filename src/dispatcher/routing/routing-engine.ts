import { Injectable } from '@nestjs/common';
import { NormalizedPrescription } from '../../common/dto/normalized-prescription.dto';
import { CappeService } from '../../cappe/cappe.service';
import { ConfigService, RoutingFilter, DefaultStrategy } from '../../config/config.service';

export interface RoutingResult {
  cappaId: string;
  cappaName: string;
  appliedFilter: string | null;
  fallbackUsed: boolean;
  defaultStrategy: DefaultStrategy;
}

@Injectable()
export class RoutingEngine {
  constructor(
    private readonly cappeService: CappeService,
    private readonly configService: ConfigService,
  ) {}

  route(prescription: NormalizedPrescription): RoutingResult {
    const config = this.configService.getConfig();
    const activeCappe = this.cappeService.getActiveCappe();

    if (activeCappe.length === 0) {
      throw new Error('Nessuna cappa attiva disponibile');
    }

    // --- Step 1: Valuta filtri specifici in ordine di priorità ---
    const enabledFilters = this.configService.getFilters().filter(f => f.enabled);

    for (const filter of enabledFilters) {
      if (!this.filterMatches(filter, prescription)) continue;

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
        if (!filter.fallbackToDefault) continue;
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

  private filterMatches(filter: RoutingFilter, p: NormalizedPrescription): boolean {
    const { conditions } = filter;
    let matched = false;
    let hasCondition = false;

    if (conditions.drugCategories?.length) {
      hasCondition = true;
      if (conditions.drugCategories.includes(p.drug.category)) matched = true;
    }
    if (conditions.ward) {
      hasCondition = true;
      if (p.patient.ward.toLowerCase().includes(conditions.ward.toLowerCase())) matched = true;
    }
    if (conditions.urgency) {
      hasCondition = true;
      if (p.priority === conditions.urgency) matched = true;
    }

    // Se non ha condizioni, non corrisponde a nulla
    if (!hasCondition) return false;

    // Per condizioni multiple: tutte devono corrispondere (AND logic)
    let allMatch = true;
    if (conditions.drugCategories?.length && !conditions.drugCategories.includes(p.drug.category)) allMatch = false;
    if (conditions.ward && !p.patient.ward.toLowerCase().includes(conditions.ward.toLowerCase())) allMatch = false;
    if (conditions.urgency && p.priority !== conditions.urgency) allMatch = false;

    return allMatch;
  }

  private applyStrategy(strategy: DefaultStrategy, prescription: NormalizedPrescription, active: any[]): any {
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

  // Mappa di normalizzazione: sinonimi e nomi italiani → categoria standard
  private readonly CATEGORY_ALIASES: Record<string, string> = {
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

  // Normalizza una stringa di specializzazione alla categoria standard
  private normalizeCategory(spec: string): string {
    const upper = (spec || '').toUpperCase().trim();
    return this.CATEGORY_ALIASES[upper] ?? upper;
  }

  // Cappa con meno lavoro in coda (tra quelle passate)
  private strategyLoadBalance(active: any[]): any {
    return active.reduce((best, c) => {
      return this.cappeService.getQueueLength(c.id) < this.cappeService.getQueueLength(best.id) ? c : best;
    });
  }

  // Cappa specializzata per categoria farmaco, con load-balance tra più match
  private strategyDrugType(prescription: NormalizedPrescription, active: any[]): any {
    const category = prescription.drug.category.toUpperCase();
    const specialized = active.filter(c =>
      c.specializations?.some((s: string) => this.normalizeCategory(s) === category),
    );
    // Se ci sono cappe specializzate, prende quella con la coda più corta
    if (specialized.length > 0) return this.strategyLoadBalance(specialized);
    // Nessuna cappa specializzata → load balance su tutte
    return this.strategyLoadBalance(active);
  }

  // STAT → cappa più libera tra quelle specializzate, poi tutte
  private strategyUrgencyFirst(prescription: NormalizedPrescription, active: any[]): any {
    if (prescription.priority === 'STAT' || prescription.priority === 'URGENT') {
      return this.strategyDrugType(prescription, active);
    }
    return this.strategyLoadBalance(active);
  }

  // Cappa assegnata al reparto tramite specializzazione
  private strategyWard(prescription: NormalizedPrescription, active: any[]): any {
    const ward = prescription.patient.ward.toUpperCase();
    const wardCappa = active.filter(c =>
      c.specializations?.some((s: string) => ward.includes(s.toUpperCase())),
    );
    if (wardCappa.length > 0) return this.strategyLoadBalance(wardCappa);
    return this.strategyLoadBalance(active);
  }
}
