import { Injectable, BadRequestException } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { FhirJsonParser } from './fhir-json.parser';
import { NormalizedPrescription } from '../common/dto/normalized-prescription.dto';

@Injectable()
export class FhirXmlParser {
  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '_',
    isArray: (name) => ['entry', 'extension', 'coding', 'dosageInstruction', 'note', 'contained'].includes(name),
  });

  constructor(private readonly fhirJsonParser: FhirJsonParser) {}

  parse(raw: string): NormalizedPrescription {
    let obj: any;
    try {
      obj = this.xmlParser.parse(raw);
    } catch (e) {
      throw new BadRequestException(`FHIR XML parse error: ${e.message}`);
    }

    // Converte struttura XML in struttura FHIR-JSON compatibile
    const fhirJson = this.xmlToFhirJson(obj);
    const result = this.fhirJsonParser.parse(JSON.stringify(fhirJson));
    return { ...result, sourceFormat: 'FHIR_XML' };
  }

  private xmlToFhirJson(obj: any): any {
    // Il documento XML FHIR ha la root che corrisponde al resourceType
    const rootKey = Object.keys(obj).find(k => k !== '?xml') ?? '';
    const root = obj[rootKey] ?? {};

    const resourceType = rootKey === 'Bundle' ? 'Bundle' : 'MedicationRequest';

    if (resourceType === 'Bundle') {
      return {
        resourceType: 'Bundle',
        entry: (root.entry ?? []).map((e: any) => ({
          resource: this.extractMedRequest(e.resource ?? e),
        })),
      };
    }

    return this.extractMedRequest(root);
  }

  private extractMedRequest(raw: any): any {
    const val = (node: any): string => {
      if (!node) return '';
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      return node._value ?? node.value ?? '';
    };

    const coding = (node: any): any[] => {
      if (!node) return [];
      const codings = Array.isArray(node.coding) ? node.coding : node.coding ? [node.coding] : [];
      return codings.map((c: any) => ({
        code: val(c.code),
        display: val(c.display),
        system: val(c.system),
      }));
    };

    const medicationCodeableConcept = raw.medicationCodeableConcept
      ? {
          text: val(raw.medicationCodeableConcept.text),
          coding: coding(raw.medicationCodeableConcept),
        }
      : undefined;

    const dosageInstruction = (Array.isArray(raw.dosageInstruction) ? raw.dosageInstruction : raw.dosageInstruction ? [raw.dosageInstruction] : []).map((d: any) => ({
      text: val(d.text),
      route: d.route ? { text: val(d.route.text), coding: coding(d.route) } : undefined,
      timing: d.timing ? {
        code: d.timing.code ? { text: val(d.timing.code.text), coding: coding(d.timing.code) } : undefined,
      } : undefined,
      // doseQuantity può trovarsi dentro <doseAndRate> (FHIR R4 standard)
      // oppure direttamente su <dosageInstruction> (alcune implementazioni non conformi)
      doseAndRate: (() => {
        const dqNode = d.doseAndRate?.doseQuantity
          ?? (Array.isArray(d.doseAndRate) ? d.doseAndRate[0]?.doseQuantity : undefined)
          ?? d.doseQuantity;
        if (!dqNode) return [];
        return [{ doseQuantity: { value: parseFloat(val(dqNode.value)), unit: val(dqNode.unit) } }];
      })(),
      rateQuantity: d.rateQuantity ? {
        value: parseFloat(val(d.rateQuantity.value)),
        unit: val(d.rateQuantity.unit),
      } : undefined,
    }));

    const extensions = (Array.isArray(raw.extension) ? raw.extension : raw.extension ? [raw.extension] : []).map((e: any) => ({
      url: e._url ?? '',
      valueString: val(e.valueString),
      valueCode: val(e.valueCode),
    }));

    return {
      resourceType: 'MedicationRequest',
      priority: val(raw.priority),
      authoredOn: val(raw.authoredOn),
      subject: raw.subject ? { reference: val(raw.subject.reference), display: val(raw.subject.display) } : undefined,
      encounter: raw.encounter ? { reference: val(raw.encounter.reference), display: val(raw.encounter.display) } : undefined,
      requester: raw.requester ? { display: val(raw.requester.display) } : undefined,
      medicationCodeableConcept,
      dosageInstruction,
      extension: extensions,
      note: (Array.isArray(raw.note) ? raw.note : raw.note ? [raw.note] : []).map((n: any) => ({ text: val(n.text) })),
    };
  }
}
