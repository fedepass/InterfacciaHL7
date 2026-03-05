import { Module } from '@nestjs/common';
import { ParsersService } from './parsers.service';
import { Hl7v2Parser } from './hl7v2.parser';
import { FhirJsonParser } from './fhir-json.parser';
import { FhirXmlParser } from './fhir-xml.parser';
import { CdaPrfParser } from './cda-prf.parser';

@Module({
  providers: [ParsersService, Hl7v2Parser, FhirJsonParser, FhirXmlParser, CdaPrfParser],
  exports: [ParsersService],
})
export class ParsersModule {}
