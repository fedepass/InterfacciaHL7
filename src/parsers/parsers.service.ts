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
    switch (format) {
      case 'HL7V2':    return this.hl7v2Parser.parse(raw);
      case 'FHIR_JSON': return this.fhirJsonParser.parse(raw);
      case 'FHIR_XML':  return this.fhirXmlParser.parse(raw);
      case 'CDA_PRF':   return this.cdaPrfParser.parse(raw);
      default:
        throw new BadRequestException(
          'Formato non riconosciuto. Supportati: HL7 v2, FHIR JSON, FHIR XML, CDA-PrF',
        );
    }
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
