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
exports.FhirXmlParser = void 0;
const common_1 = require("@nestjs/common");
const fast_xml_parser_1 = require("fast-xml-parser");
const fhir_json_parser_1 = require("./fhir-json.parser");
let FhirXmlParser = class FhirXmlParser {
    constructor(fhirJsonParser) {
        this.fhirJsonParser = fhirJsonParser;
        this.xmlParser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '_',
            isArray: (name) => ['entry', 'extension', 'coding', 'dosageInstruction', 'note', 'contained'].includes(name),
        });
    }
    parse(raw) {
        let obj;
        try {
            obj = this.xmlParser.parse(raw);
        }
        catch (e) {
            throw new common_1.BadRequestException(`FHIR XML parse error: ${e.message}`);
        }
        // Converte struttura XML in struttura FHIR-JSON compatibile
        const fhirJson = this.xmlToFhirJson(obj);
        const result = this.fhirJsonParser.parse(JSON.stringify(fhirJson));
        return { ...result, sourceFormat: 'FHIR_XML' };
    }
    xmlToFhirJson(obj) {
        // Il documento XML FHIR ha la root che corrisponde al resourceType
        const rootKey = Object.keys(obj).find(k => k !== '?xml') ?? '';
        const root = obj[rootKey] ?? {};
        const resourceType = rootKey === 'Bundle' ? 'Bundle' : 'MedicationRequest';
        if (resourceType === 'Bundle') {
            return {
                resourceType: 'Bundle',
                entry: (root.entry ?? []).map((e) => ({
                    resource: this.extractMedRequest(e.resource ?? e),
                })),
            };
        }
        return this.extractMedRequest(root);
    }
    extractMedRequest(raw) {
        const val = (node) => {
            if (!node)
                return '';
            if (typeof node === 'string' || typeof node === 'number')
                return String(node);
            return node._value ?? node.value ?? '';
        };
        const coding = (node) => {
            if (!node)
                return [];
            const codings = Array.isArray(node.coding) ? node.coding : node.coding ? [node.coding] : [];
            return codings.map((c) => ({
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
        const dosageInstruction = (Array.isArray(raw.dosageInstruction) ? raw.dosageInstruction : raw.dosageInstruction ? [raw.dosageInstruction] : []).map((d) => ({
            text: val(d.text),
            route: d.route ? { text: val(d.route.text), coding: coding(d.route) } : undefined,
            timing: d.timing ? {
                code: d.timing.code ? { text: val(d.timing.code.text), coding: coding(d.timing.code) } : undefined,
            } : undefined,
            doseAndRate: d.doseQuantity ? [{
                    doseQuantity: { value: parseFloat(val(d.doseQuantity.value)), unit: val(d.doseQuantity.unit) },
                }] : [],
            rateQuantity: d.rateQuantity ? {
                value: parseFloat(val(d.rateQuantity.value)),
                unit: val(d.rateQuantity.unit),
            } : undefined,
        }));
        const extensions = (Array.isArray(raw.extension) ? raw.extension : raw.extension ? [raw.extension] : []).map((e) => ({
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
            note: (Array.isArray(raw.note) ? raw.note : raw.note ? [raw.note] : []).map((n) => ({ text: val(n.text) })),
        };
    }
};
exports.FhirXmlParser = FhirXmlParser;
exports.FhirXmlParser = FhirXmlParser = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [fhir_json_parser_1.FhirJsonParser])
], FhirXmlParser);
