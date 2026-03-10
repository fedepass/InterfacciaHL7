import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { NormalizedPrescription, Priority } from '../common/dto/normalized-prescription.dto';

const hl7 = require('simple-hl7');

@Injectable()
export class Hl7v2Parser {
  private readonly parser = new hl7.Parser();

  parse(raw: string): NormalizedPrescription {
    const normalized = raw.replace(/\r\n|\n/g, '\r');
    let msg: any;
    try {
      msg = this.parser.parse(normalized);
    } catch (e) {
      throw new BadRequestException(`HL7 v2 parse error: ${e.message}`);
    }

    // Helper: accede a un campo e componente (1-based, come notazione HL7)
    const get = (segName: string, fieldIdx: number, compIdx = 1): string => {
      try {
        const seg = msg.getSegment(segName);
        if (!seg) return '';
        const field = seg.fields[fieldIdx - 1];
        if (!field) return '';
        const rep = field.value[0];
        if (!rep) return '';
        const comp = rep[compIdx - 1];
        if (!comp) return '';
        const val = comp.value?.[0];
        return val != null ? String(val).trim() : '';
      } catch {
        return '';
      }
    };

    // Helper: legge campo da segmento specifico per indice (es. tutti i RXC)
    const getFromSeg = (seg: any, fieldIdx: number, compIdx = 1): string => {
      try {
        const field = seg.fields[fieldIdx - 1];
        if (!field) return '';
        const rep = field.value[0];
        if (!rep) return '';
        const comp = rep[compIdx - 1];
        if (!comp) return '';
        const val = comp.value?.[0];
        return val != null ? String(val).trim() : '';
      } catch {
        return '';
      }
    };

    // ── PAZIENTE ──────────────────────────────────────────────────────────────
    const patientId   = get('PID', 3) || get('PID', 2);
    const familyName  = get('PID', 5, 1);
    const givenName   = get('PID', 5, 2);
    const patientName = [familyName, givenName].filter(Boolean).join(' ') || 'N/D';

    // PV1.3: reparto (comp.1) e letto (comp.2)
    const ward      = get('PV1', 3, 1) || 'N/D';
    const bedNumber = get('PV1', 3, 2) || undefined;

    // ── PRIORITÀ ─────────────────────────────────────────────────────────────
    // TQ1.9 (condizione urgenza) oppure ORC.7.6 (priority)
    const orcPriority = get('TQ1', 9) || get('ORC', 7, 6);
    const priority    = this.mapPriority(orcPriority);

    // ── TIMESTAMP ────────────────────────────────────────────────────────────
    const requestedAt = this.parseHL7Date(get('MSH', 7));

    // ── FARMACO: RXO o RXE ───────────────────────────────────────────────────
    const hasRXE = !!msg.getSegment('RXE');

    let drugName: string;
    let drugCode: string | undefined;
    let dosageValue: number | undefined;
    let dosageUnit: string | undefined;
    let dosage: string;
    let frequency: string;
    let infusionRateValue: string | undefined;
    let infusionRateUnit: string | undefined;

    if (hasRXE) {
      // RXE - Pharmacy Encoded Order
      // RXE.2  = Give Code (comp.1=codice, comp.2=nome)
      // RXE.3  = Give Amount - Minimum  ← quantitativo farmaco
      // RXE.4  = Give Amount - Maximum
      // RXE.5  = Give Units             ← unità dosaggio
      // RXE.6  = Give Dosage Form (es. "fiale", "sacca") — NON il dosaggio
      // RXE.23 = Give Rate Amount       ← velocità infusione (numero)
      // RXE.24 = Give Rate Units        ← velocità infusione (unità, es. ml/hr)
      drugName          = get('RXE', 2, 2) || get('RXE', 2, 1) || 'N/D';
      drugCode          = get('RXE', 2, 1) || undefined;
      const doseVal     = get('RXE', 3);
      dosageValue       = doseVal ? parseFloat(doseVal) : undefined;
      dosageUnit        = get('RXE', 5, 1) || undefined;
      dosage            = doseVal ? `${doseVal}${dosageUnit ? ' ' + dosageUnit : ''}` : 'N/D';
      frequency         = get('TQ1', 3, 1) || get('RXE', 1, 2) || 'N/D';
      infusionRateValue = get('RXE', 23) || undefined;
      infusionRateUnit  = get('RXE', 24, 1) || undefined;
    } else {
      // RXO - Pharmacy Order
      // Standard internazionale:
      //   RXO.1 = codice farmaco, RXO.2 = dose min, RXO.3 = dose max, RXO.4 = unità
      // Convenzione italiana (molto diffusa):
      //   RXO.2 = dose, RXO.3 = unità, RXO.4 = solvente, RXO.5 = volume
      // → Rilevamento automatico: se RXO.3 è un'unità farmaceutica nota,
      //   usa la convenzione italiana; altrimenti usa lo standard.
      drugName = get('RXO', 1, 2) || get('RXO', 1, 1) || 'N/D';
      drugCode = get('RXO', 1, 1) || undefined;

      const rxo2 = get('RXO', 2);
      const rxo3 = get('RXO', 3);
      const rxo4 = get('RXO', 4, 1);
      const rxo5 = get('RXO', 5, 1);

      if (rxo2 && this.isPharmUnit(rxo3)) {
        // Convenzione italiana: RXO.2=dose, RXO.3=unità, RXO.4=solvente, RXO.5=volume
        dosageValue = parseFloat(rxo2);
        dosageUnit  = rxo3 || undefined;
        // RXO.4 e RXO.5 verranno usati come solvente/volume più sotto
      } else {
        // Standard: RXO.2=dose_min, RXO.3=dose_max, RXO.4=unità
        const doseVal = rxo2 || rxo3;
        dosageValue   = doseVal ? parseFloat(doseVal) : undefined;
        dosageUnit    = rxo4 || undefined;
      }

      dosage    = dosageValue != null ? `${dosageValue}${dosageUnit ? ' ' + dosageUnit : ''}` : 'N/D';
      frequency = get('TQ1', 3, 1) || 'N/D';
      infusionRateValue = undefined;
      infusionRateUnit  = undefined;
    }

    // ── VIA DI SOMMINISTRAZIONE: RXR ─────────────────────────────────────────
    // RXR.1 = Route (comp.1=codice, comp.2=descrizione)
    const routeCode = get('RXR', 1, 1);
    const routeDesc = get('RXR', 1, 2) || get('RXR', 1, 1);
    const route     = this.mapRoute(routeCode || routeDesc);

    // ── COMPONENTI IV: segmenti RXC ───────────────────────────────────────────
    // RXC.1 = Component Type: B=Base (solvente), A=Additive (farmaco aggiunto)
    // RXC.2 = Component Code (comp.1=codice, comp.2=nome)
    // RXC.3 = Component Amount  ← volume o quantità componente
    // RXC.4 = Component Units   ← unità (es. ml, mg)
    // RXC.5 = Component Strength
    // RXC.6 = Component Strength Units
    let solvent: string | undefined;
    let volumeValue: number | undefined;
    let volumeUnit: string | undefined;

    try {
      const rxcSegs = msg.getSegments('RXC');
      if (rxcSegs && rxcSegs.length > 0) {
        // Componente Base (B) = solvente/diluente
        const baseComp = rxcSegs.find((s: any) => getFromSeg(s, 1) === 'B');
        if (baseComp) {
          const baseName   = getFromSeg(baseComp, 2, 2) || getFromSeg(baseComp, 2, 1);
          const baseAmount = getFromSeg(baseComp, 3);
          const baseUnit   = getFromSeg(baseComp, 4, 1);
          solvent          = baseName || undefined;
          volumeValue      = baseAmount ? parseFloat(baseAmount) : undefined;
          volumeUnit       = baseUnit || undefined;
        }

        // Componente Additive (A) = farmaco aggiunto (può sovrascrivere il dosaggio principale)
        const addComp = rxcSegs.find((s: any) => getFromSeg(s, 1) === 'A');
        if (addComp && !dosageValue) {
          const addAmount = getFromSeg(addComp, 3);
          const addUnit   = getFromSeg(addComp, 4, 1);
          dosageValue     = addAmount ? parseFloat(addAmount) : dosageValue;
          dosageUnit      = addUnit || dosageUnit;
          if (addAmount) dosage = `${addAmount}${addUnit ? ' ' + addUnit : ''}`;
        }
      }
    } catch { /* RXC non presente */ }

    // Fallback solvente/volume da RXO.4/RXO.5 (convenzione italiana)
    // oppure da note NTE
    if (!solvent && !hasRXE) {
      const rxo4 = get('RXO', 4, 1);
      const rxo5 = get('RXO', 5, 1);
      // RXO.4 è solvente se non è un'unità farmaceutica
      if (rxo4 && !this.isPharmUnit(rxo4)) solvent = rxo4;
      // RXO.5 come volume (es. "250ml" o "250 ml")
      if (!volumeValue && rxo5) {
        const m = rxo5.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
        if (m) { volumeValue = parseFloat(m[1]); volumeUnit = m[2]?.toLowerCase() || 'ml'; }
      }
    }
    if (!solvent) {
      solvent = this.extractSolventFromNotes(get('NTE', 3));
    }
    // Fallback volume da NTE se non trovato altrove (es. "flacone 250ml")
    // Il negative lookahead (?!\s*\/) esclude i pattern di velocità (es. "100 ml/h")
    if (!volumeValue) {
      const noteVolume = (get('NTE', 3) || '').match(/(\d+)\s*ml(?!\s*\/)/i);
      if (noteVolume) { volumeValue = parseInt(noteVolume[1]); volumeUnit = 'ml'; }
    }

    // Volume finale come stringa
    const volume = volumeValue != null
      ? `${volumeValue}${volumeUnit ? ' ' + volumeUnit : ''}`
      : undefined;

    // Velocità infusione
    const infusionRate = infusionRateValue
      ? `${infusionRateValue}${infusionRateUnit ? ' ' + infusionRateUnit : ''}`
      : undefined;

    // ── CONCENTRAZIONE FINALE CALCOLATA ───────────────────────────────────────
    // es. 50 mg / 250 ml = 0.20 mg/ml
    const finalConcentration = this.calcConcentration(dosageValue, dosageUnit, volumeValue, volumeUnit);

    // ── PRESCRITTORE ──────────────────────────────────────────────────────────
    // ORC.12 oppure PV1.7 (attending doctor): comp.2=cognome, comp.3=nome
    const docFamily    = get('ORC', 12, 2) || get('PV1', 7, 2);
    const docGiven     = get('ORC', 12, 3) || get('PV1', 7, 3);
    const prescribedBy = [docGiven, docFamily].filter(Boolean).join(' ') || undefined;

    const notes    = get('NTE', 3) || undefined;
    const category = drugCode ?? '';

    return {
      id: uuidv4(),
      sourceFormat: 'HL7V2',
      patient: { id: patientId, name: patientName, ward, bedNumber },
      drug: {
        name: drugName, code: drugCode, category,
        dosage, dosageValue, dosageUnit,
        route, solvent,
        volume, volumeValue, volumeUnit,
        infusionRate, finalConcentration,
        frequency,
      },
      priority,
      requestedAt,
      prescribedBy,
      notes,
    };
  }

  // Restituisce true se la stringa è un'unità farmaceutica standard
  private isPharmUnit(val: string): boolean {
    if (!val) return false;
    return /^(mg|g|mcg|µg|ug|ml|l|ui|iu|mmol|meq|mg\/ml|mg\/kg|unità|unit|units|cp|cpr|cps|fial[ae]|gtt|drops?)$/i.test(val.trim());
  }

  private calcConcentration(
    doseVal?: number, doseUnit?: string,
    volVal?: number, volUnit?: string,
  ): string | undefined {
    if (!doseVal || !volVal || volVal === 0) return undefined;
    const conc = doseVal / volVal;
    const concStr = conc % 1 === 0 ? conc.toString() : conc.toFixed(3).replace(/\.?0+$/, '');
    return `${concStr} ${doseUnit ?? ''}/${volUnit ?? 'ml'}`.trim();
  }

  private mapPriority(raw: string): Priority {
    const val = (raw || '').toUpperCase();
    if (val === 'S' || val === 'STAT' || val === 'ST') return 'STAT';
    if (val === 'A' || val === 'ASAP' || val === 'U' || val === 'URGENT') return 'URGENT';
    return 'ROUTINE';
  }

  private mapRoute(raw: string): string {
    const map: Record<string, string> = {
      IV: 'IV', IVP: 'IV', IVPB: 'IV', '47625008': 'IV',
      IM: 'IM', '78421000': 'IM',
      SC: 'SC', SQ: 'SC', '34206005': 'SC',
      PO: 'PO', ORAL: 'PO', '26643006': 'PO',
      SL: 'SL',
    };
    return map[(raw || '').toUpperCase()] || raw || 'N/D';
  }

  private parseHL7Date(raw: string): Date {
    if (!raw || raw.length < 8) return new Date();
    const y  = raw.substring(0, 4);
    const mo = raw.substring(4, 6);
    const d  = raw.substring(6, 8);
    const h  = raw.substring(8, 10) || '00';
    const mi = raw.substring(10, 12) || '00';
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
  }

  private extractSolventFromNotes(notes: string): string | undefined {
    if (!notes) return undefined;
    const match = notes.match(/(NaCl 0\.9%|Glucosio 5%|Ringer lattato|NaCl|Glucosio|Fisiologica|Ringer|acqua per preparazioni iniettabili)/i);
    return match ? match[0] : undefined;
  }

}
