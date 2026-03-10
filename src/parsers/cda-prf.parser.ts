import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { NormalizedPrescription, Priority } from '../common/dto/normalized-prescription.dto';
import { inferCategory } from './drug-category.util';

@Injectable()
export class CdaPrfParser {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    removeNSPrefix: true,
    // Solo gli elementi effettivamente ripetibili sono array
    isArray: (name) =>
      ['id', 'qualifier', 'translation', 'ingredient', 'entryRelationship', 'entry', 'templateId'].includes(name),
  });

  parse(raw: string): NormalizedPrescription {
    let doc: any;
    try {
      doc = this.xmlParser.parse(raw);
    } catch (e) {
      throw new BadRequestException(`CDA-PrF parse error: ${e.message}`);
    }

    const cd = doc.ClinicalDocument;
    if (!cd) throw new BadRequestException('Documento CDA non valido: elemento ClinicalDocument mancante');

    // ── PAZIENTE ──────────────────────────────────────────────────────────────
    const patRole = cd.recordTarget?.patientRole;
    const pat = patRole?.patient;
    const nameEl = pat?.name;
    // name può essere oggetto singolo o array
    const nameObj = Array.isArray(nameEl) ? nameEl[0] : nameEl;
    const patientName = [this.txt(nameObj?.family), this.txt(nameObj?.given)].filter(Boolean).join(' ') || 'N/D';

    // id[] — preferisce Codice Fiscale (OID termina con .4.3.2)
    const patIds: any[] = Array.isArray(patRole?.id) ? patRole.id : patRole?.id ? [patRole.id] : [];
    const cfId = patIds.find(i => this.attr(i, 'root').endsWith('4.3.2')) ?? patIds[0];
    const patientId = this.attr(cfId, 'extension') || 'N/D';

    // ── TIMESTAMP ─────────────────────────────────────────────────────────────
    const requestedAt = this.parseHL7DT(this.attr(cd.effectiveTime, 'value')) ?? new Date();

    // ── PRESCRITTORE ──────────────────────────────────────────────────────────
    const authorEl = cd.author;
    const aa = Array.isArray(authorEl) ? authorEl[0]?.assignedAuthor : authorEl?.assignedAuthor;
    const apNameEl = aa?.assignedPerson?.name;
    const apNameObj = Array.isArray(apNameEl) ? apNameEl[0] : apNameEl;
    const prescribedBy =
      [this.txt(apNameObj?.given), this.txt(apNameObj?.family)].filter(Boolean).join(' ') || undefined;

    // ── REPARTO ───────────────────────────────────────────────────────────────
    const enc = cd.componentOf?.encompassingEncounter;
    const ward = this.extractWard(enc) ?? 'N/D';

    // ── SEZIONE PRESCRIZIONI (LOINC 57828-6) ──────────────────────────────────
    const bodyComp = cd.component;
    const structuredBody = Array.isArray(bodyComp) ? bodyComp[0]?.structuredBody : bodyComp?.structuredBody;
    const sections: any[] = this.getArr(structuredBody?.component);
    const prescSection = sections.find(c => this.attr(c.section?.code, 'code') === '57828-6')?.section;
    if (!prescSection) throw new BadRequestException('Sezione prescrizioni (LOINC 57828-6) non trovata nel documento CDA-PrF');

    const entries: any[] = this.getArr(prescSection.entry);
    const sa = entries[0]?.substanceAdministration;
    if (!sa) throw new BadRequestException('Nessuna substanceAdministration trovata nella sezione prescrizioni');

    // ── PRIORITÀ ──────────────────────────────────────────────────────────────
    const priority = this.extractPriority(sa, cd);

    // ── FARMACO ───────────────────────────────────────────────────────────────
    const { drugName, drugCode, drugCategory } = this.extractDrug(sa);

    // ── DOSAGGIO ──────────────────────────────────────────────────────────────
    const dq = sa.doseQuantity;
    const dosageValue = dq ? parseFloat(this.attr(dq, 'value')) || undefined : undefined;
    const dosageUnit  = this.attr(dq, 'unit') || undefined;
    const dosage = dosageValue != null ? `${dosageValue}${dosageUnit ? ' ' + dosageUnit : ''}` : 'N/D';

    // ── VIA DI SOMMINISTRAZIONE ───────────────────────────────────────────────
    const rc = sa.routeCode;
    const route = this.mapRoute(this.attr(rc, 'code') || this.attr(rc, 'displayName'));

    // ── FREQUENZA ─────────────────────────────────────────────────────────────
    const frequency = this.extractFrequency(sa.effectiveTime);

    // ── COMPONENTI IV (solvente, volume, velocità) ────────────────────────────
    const { solvent, volumeValue, volumeUnit, infusionRate, notes } = this.extractIVInfo(sa);
    const volume = volumeValue != null ? `${volumeValue}${volumeUnit ? ' ' + volumeUnit : ''}` : undefined;
    const finalConcentration = this.calcConcentration(dosageValue, dosageUnit, volumeValue, volumeUnit);

    return {
      id: uuidv4(),
      sourceFormat: 'CDA_PRF',
      patient: { id: patientId, name: patientName, ward },
      drug: {
        name: drugName, code: drugCode, category: drugCategory,
        dosage, dosageValue, dosageUnit,
        route, solvent, volume, volumeValue, volumeUnit,
        infusionRate, finalConcentration, frequency,
      },
      priority,
      requestedAt,
      prescribedBy,
      notes,
    };
  }

  // ── Estrazione farmaco ──────────────────────────────────────────────────────

  private extractDrug(sa: any): { drugName: string; drugCode?: string; drugCategory: string } {
    const product = sa.consumable?.manufacturedProduct;

    // Farmaco industriale (manufacturedLabeledDrug)
    const ld = product?.manufacturedLabeledDrug;
    if (ld) {
      const codeEl = ld.code;
      const displayName = this.attr(codeEl, 'displayName');
      const drugName = displayName || this.txt(ld.name) || 'N/D';

      // ATC è nella translation con OID 2.16.840.1.113883.6.73
      const translations: any[] = Array.isArray(codeEl?.translation) ? codeEl.translation : codeEl?.translation ? [codeEl.translation] : [];
      const atcTr = translations.find(tr => this.attr(tr, 'codeSystem') === '2.16.840.1.113883.6.73');
      // Usa ATC se disponibile, altrimenti AIC (codice primario)
      const drugCode = this.attr(atcTr, 'code') || this.attr(codeEl, 'code') || undefined;

      return { drugName, drugCode, drugCategory: inferCategory(drugName, drugCode) };
    }

    // Preparazione magistrale (manufacturedMaterial)
    const mm = product?.manufacturedMaterial;
    if (mm) {
      const drugName = this.txt(mm.name) || this.attr(mm.code, 'displayName') || 'Preparazione magistrale';
      const ingredients: any[] = Array.isArray(mm.ingredient) ? mm.ingredient : mm.ingredient ? [mm.ingredient] : [];
      const active = ingredients.find(i => this.attr(i, 'classCode') === 'ACTI');
      const drugCode = this.attr(active?.ingredientSubstance?.code, 'code') || undefined;
      return { drugName, drugCode, drugCategory: inferCategory(drugName, drugCode) };
    }

    return { drugName: 'N/D', drugCode: undefined, drugCategory: 'OTHER' };
  }

  // ── Reparto dall'encompassingEncounter ─────────────────────────────────────

  private extractWard(enc: any): string | undefined {
    if (!enc) return undefined;
    const hcf = enc.location?.healthCareFacility;
    const orgName = this.txt(hcf?.serviceProviderOrganization?.name);
    if (orgName) return orgName;
    const codeDisplay = this.attr(hcf?.code, 'displayName');
    if (codeDisplay) return codeDisplay;
    // Fallback: nome organizzazione del custodian non disponibile qui
    return undefined;
  }

  // ── Priorità ───────────────────────────────────────────────────────────────

  private extractPriority(sa: any, cd: any): Priority {
    // 1. priorityCode su substanceAdministration (HL7 RIM standard)
    const pc = this.attr(sa?.priorityCode, 'code').toUpperCase();
    if (pc === 'S' || pc === 'ST') return 'STAT';
    if (pc === 'A' || pc === 'UR') return 'URGENT';
    if (pc === 'R') return 'ROUTINE';

    // 2. Qualifier TP sul codice documento (convenzione CDA-PrF italiana)
    // Cercato prima direttamente su cd.code, poi nelle translation (entrambe le strutture sono valide)
    const allQualifierSources: any[] = [];
    if (cd.code?.qualifier) {
      // Struttura standard: <code><qualifier>...</qualifier></code>
      const directQuals = Array.isArray(cd.code.qualifier) ? cd.code.qualifier : [cd.code.qualifier];
      allQualifierSources.push(...directQuals);
    }
    const translations: any[] = Array.isArray(cd.code?.translation) ? cd.code.translation : cd.code?.translation ? [cd.code.translation] : [];
    for (const tr of translations) {
      const trQuals: any[] = Array.isArray(tr.qualifier) ? tr.qualifier : tr.qualifier ? [tr.qualifier] : [];
      allQualifierSources.push(...trQuals);
    }
    for (const qual of allQualifierSources) {
      if (this.attr(qual.name, 'code') === 'TP') {
        const tpVal = this.attr(qual.value, 'code').toUpperCase();
        if (tpVal === 'ST' || tpVal === 'A') return 'STAT';
        if (tpVal === 'UE') return 'URGENT';
      }
    }

    return 'ROUTINE';
  }

  // ── Frequenza dall'effectiveTime ───────────────────────────────────────────

  private extractFrequency(effectiveTime: any): string {
    if (!effectiveTime) return 'N/D';
    const et = Array.isArray(effectiveTime) ? effectiveTime[0] : effectiveTime;
    if (!et) return 'N/D';

    // Pattern periodo: <period value="8" unit="h"/>
    const period = et.period;
    if (period) {
      const val  = parseFloat(this.attr(period, 'value'));
      const unit = (this.attr(period, 'unit') || 'h').toLowerCase();
      if (isNaN(val)) return 'N/D';
      const hours = unit === 'd' ? val * 24 : unit === 'h' ? val : unit === 'min' ? val / 60 : val;
      if (hours <= 1)  return 'Q1H';
      if (hours <= 2)  return 'Q2H';
      if (hours <= 4)  return 'Q4H';
      if (hours <= 6)  return 'Q6H';
      if (hours <= 8)  return 'Q8H';
      if (hours <= 12) return 'Q12H';
      if (hours <= 24) return 'QD';
      if (hours <= 48) return 'Q2D';
      return `Q${val}${unit.toUpperCase()}`;
    }

    // Pattern evento: <event code="ONCE" .../>
    const event = et.event;
    if (event) return this.attr(event, 'code') || 'N/D';

    return 'N/D';
  }

  // ── Componenti IV: solvente, volume, velocità infusione ────────────────────

  private extractIVInfo(sa: any): {
    solvent?: string; volumeValue?: number; volumeUnit?: string;
    infusionRate?: string; notes?: string;
  } {
    const rels: any[] = Array.isArray(sa.entryRelationship) ? sa.entryRelationship : sa.entryRelationship ? [sa.entryRelationship] : [];

    // 1. Ingrediente veicolo in preparazione magistrale (classCode ADJTV o MMAT)
    const mm = sa.consumable?.manufacturedProduct?.manufacturedMaterial;
    if (mm) {
      const ingredients: any[] = Array.isArray(mm.ingredient) ? mm.ingredient : mm.ingredient ? [mm.ingredient] : [];
      const vehicle = ingredients.find(i => ['ADJTV', 'MMAT', 'BASE'].includes(this.attr(i, 'classCode')));
      if (vehicle) {
        const solvent = this.txt(vehicle.ingredientSubstance?.name)
          || this.attr(vehicle.ingredientSubstance?.code, 'displayName')
          || undefined;
        const qtyVal = parseFloat(this.attr(vehicle.quantity, 'value'));
        const qtyUnit = this.attr(vehicle.quantity, 'unit') || 'ml';
        return {
          solvent,
          volumeValue: isNaN(qtyVal) ? undefined : qtyVal,
          volumeUnit: isNaN(qtyVal) ? undefined : qtyUnit,
        };
      }
    }

    // 2. Nota prescrittore (SUBJ + LOINC 48767-8) — parsing testo libero
    const subjNote = rels
      .filter(r => this.attr(r, 'typeCode') === 'SUBJ')
      .map(r => r.act)
      .find(act => act && this.attr(act.code, 'code') === '48767-8');

    const noteText = this.txt(subjNote?.text) || '';
    const ivParsed = this.parseIVNote(noteText);

    return { ...ivParsed, notes: noteText || undefined };
  }

  // ── Pattern matching su nota libera per solvente/volume/velocità ───────────

  private parseIVNote(text: string): {
    solvent?: string; volumeValue?: number; volumeUnit?: string; infusionRate?: string;
  } {
    if (!text) return {};
    const tl = text.toLowerCase();

    let solvent: string | undefined;
    if (/nacl|fisiologica|salina|cloruro.*sodio|0\.9%/.test(tl)) solvent = 'NaCl 0.9%';
    else if (/glucosio|glucose|5%/.test(tl)) solvent = 'Glucosio 5%';
    else if (/ringer/.test(tl)) solvent = 'Ringer lattato';

    // Volume: "250ml" o "250 ml"
    const volMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/i);
    // Velocità: "100ml/h" o "100 ml/h" — prendere il secondo match se volMatch è presente
    const rateMatch = text.match(/(\d+(?:\.\d+)?)\s*ml\s*\/\s*h/i);

    // Se trovato "100ml/h", il volume è il primo numero ml che NON è la velocità
    let volumeValue: number | undefined;
    if (volMatch) {
      const volNum = parseFloat(volMatch[1]);
      const rateNum = rateMatch ? parseFloat(rateMatch[1]) : undefined;
      // Se il volume trovato coincide con la velocità, cerca un altro
      if (rateNum && volNum === rateNum) {
        const allVol = [...text.matchAll(/(\d+(?:\.\d+)?)\s*ml(?!\s*\/)/gi)];
        const other = allVol.find(m => parseFloat(m[1]) !== rateNum);
        volumeValue = other ? parseFloat(other[1]) : undefined;
      } else {
        volumeValue = volNum;
      }
    }

    return {
      solvent,
      volumeValue,
      volumeUnit: volumeValue ? 'ml' : undefined,
      infusionRate: rateMatch ? `${rateMatch[1]} ml/h` : undefined,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Restituisce il valore di un attributo XML (prefissato con _ da fast-xml-parser) */
  private attr(node: any, name: string): string {
    if (!node) return '';
    return String(node[`_${name}`] ?? '');
  }

  /** Restituisce il testo di un nodo: stringa diretta, attributo value, o #text */
  private txt(node: any): string {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (node['#text']) return String(node['#text']);
    if (node._value) return String(node._value);
    return '';
  }

  /** Normalizza a array */
  private getArr(v: any): any[] {
    return Array.isArray(v) ? v : v ? [v] : [];
  }

  private mapRoute(raw: string): string {
    const map: Record<string, string> = {
      '47625008': 'IV', 'IV': 'IV', 'INTRAVENOUS': 'IV', 'INTRAVENOSO': 'IV', 'ENDOVENOSA': 'IV', 'EV': 'IV',
      '78421000': 'IM', 'IM': 'IM', 'INTRAMUSCULAR': 'IM', 'INTRAMUSCOLARE': 'IM',
      '26643006': 'PO', 'PO': 'PO', 'ORAL': 'PO', 'ORALE': 'PO',
      '34206005': 'SC', 'SC': 'SC', 'SUBCUTANEOUS': 'SC', 'SOTTOCUTANEA': 'SC',
    };
    return map[(raw || '').toUpperCase()] ?? raw ?? 'N/D';
  }

  private parseHL7DT(val: string): Date | null {
    if (!val || val.length < 8) return null;
    // Rimuove offset timezone: +0100 o +01:00
    const s = val.replace(/[+\-]\d{2}:?\d{2}$/, '');
    const y = s.slice(0, 4), m = s.slice(4, 6), d = s.slice(6, 8);
    const h = s.slice(8, 10) || '00', mi = s.slice(10, 12) || '00', se = s.slice(12, 14) || '00';
    const dt = new Date(`${y}-${m}-${d}T${h}:${mi}:${se}`);
    return isNaN(dt.getTime()) ? null : dt;
  }

  private calcConcentration(doseVal?: number, doseUnit?: string, volVal?: number, volUnit?: string): string | undefined {
    if (!doseVal || !volVal || volVal === 0) return undefined;
    const c  = doseVal / volVal;
    const cs = c % 1 === 0 ? c.toString() : c.toFixed(3).replace(/\.?0+$/, '');
    return `${cs} ${doseUnit ?? ''}/${volUnit ?? 'ml'}`.trim();
  }

}
