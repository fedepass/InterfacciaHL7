"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirJsonParser = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
let FhirJsonParser = class FhirJsonParser {
    parse(raw) {
        let resource;
        try {
            resource = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
        catch (e) {
            throw new common_1.BadRequestException(`FHIR JSON parse error: ${e.message}`);
        }
        // Supporta MedicationRequest standalone e Bundle
        const medReq = resource.resourceType === 'Bundle'
            ? resource.entry?.find((e) => e.resource?.resourceType === 'MedicationRequest')?.resource
            : resource;
        if (!medReq || medReq.resourceType !== 'MedicationRequest') {
            throw new common_1.BadRequestException('Il payload FHIR JSON non contiene una risorsa MedicationRequest');
        }
        const dosageInstr = medReq.dosageInstruction?.[0] ?? {};
        const extensions = medReq.extension ?? [];
        // ── FARMACO ───────────────────────────────────────────────────────────────
        const medConcept = medReq.medicationCodeableConcept
            ?? medReq.contained?.find((r) => r.resourceType === 'Medication');
        const drugName = medConcept?.text
            ?? medConcept?.code?.text
            ?? medConcept?.code?.coding?.[0]?.display
            ?? 'N/D';
        const drugCode = medConcept?.code?.coding?.[0]?.code
            ?? medConcept?.coding?.[0]?.code
            ?? undefined;
        // ── DOSAGGIO FARMACO ATTIVO ───────────────────────────────────────────────
        // doseAndRate[0].doseQuantity = quantitativo farmaco (es. 50 mg)
        // doseAndRate[0].doseRange    = range dosaggio (min/max)
        const doseAndRate = dosageInstr.doseAndRate?.[0];
        const doseQty = doseAndRate?.doseQuantity ?? dosageInstr.doseQuantity;
        const dosageValue = doseQty?.value != null ? Number(doseQty.value) : undefined;
        const dosageUnit = doseQty?.unit ?? doseQty?.code ?? undefined;
        const dosage = dosageValue != null
            ? `${dosageValue}${dosageUnit ? ' ' + dosageUnit : ''}`
            : 'N/D';
        // ── VIA DI SOMMINISTRAZIONE ───────────────────────────────────────────────
        const routeRaw = dosageInstr.route?.coding?.[0]?.code
            ?? dosageInstr.route?.coding?.[0]?.display
            ?? dosageInstr.route?.text
            ?? '';
        const route = this.mapFhirRoute(routeRaw);
        // ── FREQUENZA ─────────────────────────────────────────────────────────────
        const frequency = dosageInstr.timing?.code?.text
            ?? dosageInstr.timing?.code?.coding?.[0]?.display
            ?? dosageInstr.timing?.repeat?.periodUnit
            ?? dosageInstr.text
            ?? 'N/D';
        // ── VELOCITÀ DI INFUSIONE ─────────────────────────────────────────────────
        // rateQuantity = velocità (es. 100 ml/h)
        // rateRatio    = rapporto (numerator/denominator)
        let infusionRate;
        if (dosageInstr.rateQuantity) {
            const rv = dosageInstr.rateQuantity.value;
            const ru = dosageInstr.rateQuantity.unit ?? dosageInstr.rateQuantity.code ?? '';
            infusionRate = `${rv} ${ru}`.trim();
        }
        else if (dosageInstr.rateRatio) {
            const num = dosageInstr.rateRatio.numerator;
            const den = dosageInstr.rateRatio.denominator;
            if (num && den) {
                infusionRate = `${num.value} ${num.unit ?? ''}/${den.value} ${den.unit ?? ''}`.trim();
            }
        }
        // ── SOLVENTE E VOLUME SACCA ───────────────────────────────────────────────
        // Prima sorgente: extension esplicite (solvent, volume)
        // Seconda sorgente: Medication.ingredient nel contained
        // Terza sorgente: maxDosePerPeriod o note
        // Solvente da extension
        const solventFromExt = this.extractExtension(extensions, 'solvent')
            ?? this.extractExtension(dosageInstr.extension ?? [], 'solvent');
        // Volume da extension (stringa es. "250 ml")
        const volumeFromExt = this.extractExtension(extensions, 'volume')
            ?? this.extractExtension(dosageInstr.extension ?? [], 'volume');
        // Cerca componenti nel Medication contained (es. base/solvente e additivo/farmaco)
        let solventFromIngredient;
        let volumeFromIngredient;
        let volumeUnitFromIngredient;
        const containedMed = medReq.contained?.find((r) => r.resourceType === 'Medication');
        if (containedMed?.ingredient) {
            for (const ing of containedMed.ingredient) {
                const isBase = ing.isActive === false || ing.extension?.some((e) => e.url?.includes('base'));
                const ingName = ing.itemCodeableConcept?.text ?? ing.itemCodeableConcept?.coding?.[0]?.display ?? '';
                if (isBase && ingName) {
                    solventFromIngredient = ingName;
                    const strength = ing.strength?.numerator;
                    if (strength) {
                        volumeFromIngredient = Number(strength.value);
                        volumeUnitFromIngredient = strength.unit ?? strength.code ?? 'ml';
                    }
                }
            }
        }
        const solvent = solventFromExt ?? solventFromIngredient ?? undefined;
        // Volume: preferisce extension stringa, poi ingredient, poi calcolo da doseQty se in ml
        let volumeValue;
        let volumeUnit;
        if (volumeFromExt) {
            // Parsa stringa "250 ml" → value=250, unit="ml"
            const m = volumeFromExt.match(/^([\d.]+)\s*(.*)$/);
            volumeValue = m ? parseFloat(m[1]) : undefined;
            volumeUnit = m?.[2]?.trim() || 'ml';
        }
        else if (volumeFromIngredient != null) {
            volumeValue = volumeFromIngredient;
            volumeUnit = volumeUnitFromIngredient ?? 'ml';
        }
        else if (doseQty?.unit?.toLowerCase().includes('ml')) {
            // Fallback: il dosaggio stesso è espresso in ml (soluzione già pronta)
            volumeValue = dosageValue;
            volumeUnit = 'ml';
        }
        const volume = volumeValue != null
            ? `${volumeValue}${volumeUnit ? ' ' + volumeUnit : ''}`
            : undefined;
        // ── CONCENTRAZIONE FINALE CALCOLATA ───────────────────────────────────────
        const finalConcentration = this.calcConcentration(dosageValue, dosageUnit, volumeValue, volumeUnit);
        // ── PAZIENTE ──────────────────────────────────────────────────────────────
        const patientRef = medReq.subject?.reference ?? '';
        const patientId = patientRef.replace('Patient/', '');
        const patientDisplay = medReq.subject?.display ?? 'N/D';
        // ── REPARTO ───────────────────────────────────────────────────────────────
        const ward = medReq.encounter?.display
            ?? this.extractExtension(extensions, 'ward')
            ?? 'N/D';
        const bedNumber = this.extractExtension(extensions, 'bedNumber') ?? undefined;
        // ── PRIORITÀ ─────────────────────────────────────────────────────────────
        const priority = this.mapFhirPriority(medReq.priority);
        // ── TIMESTAMP ────────────────────────────────────────────────────────────
        const requestedAt = medReq.authoredOn ? new Date(medReq.authoredOn) : new Date();
        const prescribedBy = medReq.requester?.display ?? undefined;
        const notes = medReq.note?.[0]?.text ?? undefined;
        const category = this.inferCategory(drugName, drugCode);
        return {
            id: (0, uuid_1.v4)(),
            sourceFormat: 'FHIR_JSON',
            patient: { id: patientId, name: patientDisplay, ward, bedNumber },
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
    calcConcentration(doseVal, doseUnit, volVal, volUnit) {
        if (!doseVal || !volVal || volVal === 0)
            return undefined;
        const conc = doseVal / volVal;
        const concStr = conc % 1 === 0 ? conc.toString() : conc.toFixed(3).replace(/\.?0+$/, '');
        return `${concStr} ${doseUnit ?? ''}/${volUnit ?? 'ml'}`.trim();
    }
    mapFhirPriority(raw) {
        const val = (raw || '').toLowerCase();
        if (val === 'stat')
            return 'STAT';
        if (val === 'urgent' || val === 'asap')
            return 'URGENT';
        return 'ROUTINE';
    }
    mapFhirRoute(raw) {
        const map = {
            '47625008': 'IV', 'IV': 'IV', 'INTRAVENOUS': 'IV',
            '78421000': 'IM', 'IM': 'IM', 'INTRAMUSCULAR': 'IM',
            '26643006': 'PO', 'PO': 'PO', 'ORAL': 'PO',
            '34206005': 'SC', 'SC': 'SC', 'SUBCUTANEOUS': 'SC',
        };
        return map[(raw || '').toUpperCase()] ?? raw ?? 'N/D';
    }
    extractExtension(extensions, key) {
        const ext = extensions.find((e) => e.url?.toLowerCase().includes(key.toLowerCase()));
        return ext?.valueString ?? ext?.valueCode ?? undefined;
    }
    inferCategory(name, code) {
        const n = (name || '').toLowerCase();
        if (/methotrex|cisplat|carboplat|cyclophos|doxorub|fluorourac|vincrist|paclitax|gemcitab|irinotecan|oxaliplat|etoposid|bleomycin|dacarbaz|ifosfam/.test(n))
            return 'CHEMOTHERAPY';
        if (/cyclosporin|tacrolimus|mycophenolat|azathioprin|sirolimus|everolimus/.test(n))
            return 'IMMUNOSUPPRESSANT';
        if (/amoxicil|ampicil|cefazolin|ceftriaxon|vancomycin|vancomicin|meropenem|piperacillin|metronidazol|ciprofloxacin|levofloxacin|imipenem|linezolid|daptomycin/.test(n))
            return 'ANTIBIOTIC';
        if (/heparin|eparina|warfarin|enoxaparin|fondaparin|dabigatran|rivaroxaban/.test(n))
            return 'ANTICOAGULANT';
        if (/glucose|glucosio|dextrose|amino acid|aminoacid|lipid|lipide|tpn|parenteral|nutriflex|kabiven/.test(n))
            return 'NUTRITION';
        if (/morphine|morfina|fentanyl|oxycodone|ossicodone|tramadol|hydromorphone|remifentanil|sufentanil/.test(n))
            return 'ANALGESIC_OPIOID';
        if (/insulin|insulina/.test(n))
            return 'INSULIN';
        return 'OTHER';
    }
};
exports.FhirJsonParser = FhirJsonParser;
exports.FhirJsonParser = FhirJsonParser = __decorate([
    (0, common_1.Injectable)()
], FhirJsonParser);
