-- Migration v2.1: Rimozione tabelle classificazione farmaci
-- La categoria farmaco è ora il valore letterale del codice/categoria
-- letto direttamente dalla decodifica del tracciato HL7/FHIR/CDA in ingresso.

DROP TABLE IF EXISTS ana_drug_category_atc;
DROP TABLE IF EXISTS ana_atc_level2;
DROP TABLE IF EXISTS ana_atc_level1;
DROP TABLE IF EXISTS ana_drug_category_aliases;
DROP TABLE IF EXISTS ana_drug_categories;
