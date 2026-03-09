import { Injectable, BadRequestException } from '@nestjs/common';
import { Hl7v2Parser } from './hl7v2.parser';
import { FhirJsonParser } from './fhir-json.parser';
import { FhirXmlParser } from './fhir-xml.parser';
import { CdaPrfParser } from './cda-prf.parser';
import { NormalizedPrescription } from '../common/dto/normalized-prescription.dto';

@Injectable()
export class ParsersService {
  constructor(
    private readonly hl7v2Parser: Hl7v2Parser,
    private readonly fhirJsonParser: FhirJsonParser,
    private readonly fhirXmlParser: FhirXmlParser,
    private readonly cdaPrfParser: CdaPrfParser,
  ) {}

  parse(raw: string): NormalizedPrescription {
    const format = this.detectFormat(raw.trim());
    let result: NormalizedPrescription;
    switch (format) {
      case 'HL7V2':     result = this.hl7v2Parser.parse(raw);     break;
      case 'FHIR_JSON': result = this.fhirJsonParser.parse(raw);  break;
      case 'FHIR_XML':  result = this.fhirXmlParser.parse(raw);   break;
      case 'CDA_PRF':   result = this.cdaPrfParser.parse(raw);    break;
      default:
        throw new BadRequestException(
          'Formato non riconosciuto. Supportati: HL7 v2, FHIR JSON, FHIR XML, CDA-PrF',
        );
    }
    return this.sanitize(result);
  }

  /**
   * Rimuove dati di volume/solvente clinicamente impossibili.
   * Una siringa (SC, IM o route "SIRINGA") non può contenere più di 60 ml:
   * se il volume parsificato supera tale soglia, quasi certamente deriva da
   * un errore nel messaggio sorgente (es. copiato da una ricetta IV).
   */
  private sanitize(p: NormalizedPrescription): NormalizedPrescription {
    const MAX_SYRINGE_ML = 60;
    const route = (p.drug.route ?? '').toUpperCase();
    const isSyringeRoute =
      route === 'SC' ||
      route === 'IM' ||
      route.includes('SIRING'); // copre SIRINGA, siringa, ecc.

    if (isSyringeRoute && (p.drug.volumeValue ?? 0) > MAX_SYRINGE_ML) {
      p.drug.volume            = undefined;
      p.drug.volumeValue       = undefined;
      p.drug.volumeUnit        = undefined;
      p.drug.solvent           = undefined;
      p.drug.infusionRate      = undefined;
      p.drug.finalConcentration = undefined;
    }
    return p;
  }

  detectFormat(raw: string): 'HL7V2' | 'FHIR_JSON' | 'FHIR_XML' | 'CDA_PRF' | 'UNKNOWN' {
    // HL7 v2: inizia con MSH|
    if (raw.startsWith('MSH|')) return 'HL7V2';

    // Documenti XML
    if (raw.startsWith('<') || raw.startsWith('<?xml')) {
      // CDA R2: contiene ClinicalDocument (controllo prima di FHIR XML)
      if (raw.includes('ClinicalDocument')) return 'CDA_PRF';
      // FHIR XML: MedicationRequest o Bundle
      if (raw.includes('MedicationRequest') || raw.includes('Bundle')) return 'FHIR_XML';
    }

    // FHIR JSON: JSON object con resourceType
    if (raw.startsWith('{')) {
      try {
        const obj = JSON.parse(raw);
        if (obj.resourceType === 'MedicationRequest' || obj.resourceType === 'Bundle') return 'FHIR_JSON';
      } catch {
        // non è JSON valido
      }
    }

    return 'UNKNOWN';
  }
}
