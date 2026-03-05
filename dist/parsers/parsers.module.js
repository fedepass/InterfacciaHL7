"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsersModule = void 0;
const common_1 = require("@nestjs/common");
const parsers_service_1 = require("./parsers.service");
const hl7v2_parser_1 = require("./hl7v2.parser");
const fhir_json_parser_1 = require("./fhir-json.parser");
const fhir_xml_parser_1 = require("./fhir-xml.parser");
const cda_prf_parser_1 = require("./cda-prf.parser");
let ParsersModule = class ParsersModule {
};
exports.ParsersModule = ParsersModule;
exports.ParsersModule = ParsersModule = __decorate([
    (0, common_1.Module)({
        providers: [parsers_service_1.ParsersService, hl7v2_parser_1.Hl7v2Parser, fhir_json_parser_1.FhirJsonParser, fhir_xml_parser_1.FhirXmlParser, cda_prf_parser_1.CdaPrfParser],
        exports: [parsers_service_1.ParsersService],
    })
], ParsersModule);
