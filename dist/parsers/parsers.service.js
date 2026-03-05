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
exports.ParsersService = void 0;
const common_1 = require("@nestjs/common");
const hl7v2_parser_1 = require("./hl7v2.parser");
const fhir_json_parser_1 = require("./fhir-json.parser");
const fhir_xml_parser_1 = require("./fhir-xml.parser");
const cda_prf_parser_1 = require("./cda-prf.parser");
let ParsersService = class ParsersService {
    constructor(hl7v2Parser, fhirJsonParser, fhirXmlParser, cdaPrfParser) {
        this.hl7v2Parser = hl7v2Parser;
        this.fhirJsonParser = fhirJsonParser;
        this.fhirXmlParser = fhirXmlParser;
        this.cdaPrfParser = cdaPrfParser;
    }
    parse(raw) {
        const format = this.detectFormat(raw.trim());
        switch (format) {
            case 'HL7V2': return this.hl7v2Parser.parse(raw);
            case 'FHIR_JSON': return this.fhirJsonParser.parse(raw);
            case 'FHIR_XML': return this.fhirXmlParser.parse(raw);
            case 'CDA_PRF': return this.cdaPrfParser.parse(raw);
            default:
                throw new common_1.BadRequestException('Formato non riconosciuto. Supportati: HL7 v2, FHIR JSON, FHIR XML, CDA-PrF');
        }
    }
    detectFormat(raw) {
        // HL7 v2: inizia con MSH|
        if (raw.startsWith('MSH|'))
            return 'HL7V2';
        // Documenti XML
        if (raw.startsWith('<') || raw.startsWith('<?xml')) {
            // CDA R2: contiene ClinicalDocument (controllo prima di FHIR XML)
            if (raw.includes('ClinicalDocument'))
                return 'CDA_PRF';
            // FHIR XML: MedicationRequest o Bundle
            if (raw.includes('MedicationRequest') || raw.includes('Bundle'))
                return 'FHIR_XML';
        }
        // FHIR JSON: JSON object con resourceType
        if (raw.startsWith('{')) {
            try {
                const obj = JSON.parse(raw);
                if (obj.resourceType === 'MedicationRequest' || obj.resourceType === 'Bundle')
                    return 'FHIR_JSON';
            }
            catch {
                // non è JSON valido
            }
        }
        return 'UNKNOWN';
    }
};
exports.ParsersService = ParsersService;
exports.ParsersService = ParsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [hl7v2_parser_1.Hl7v2Parser,
        fhir_json_parser_1.FhirJsonParser,
        fhir_xml_parser_1.FhirXmlParser,
        cda_prf_parser_1.CdaPrfParser])
], ParsersService);
