export type SourceFormat = 'HL7V2' | 'FHIR_JSON' | 'FHIR_XML' | 'CDA_PRF';
export type Priority = 'STAT' | 'URGENT' | 'ROUTINE';
export type DrugRoute = 'IV' | 'IM' | 'PO' | 'SC' | string;

export interface PatientInfo {
  id: string;
  name: string;
  ward: string;
  bedNumber?: string;
}

export interface DrugInfo {
  name: string;
  code?: string;
  category: string;
  // Quantitativo farmaco attivo (es. "50 mg")
  dosage: string;
  // Valore numerico dosaggio per calcoli
  dosageValue?: number;
  dosageUnit?: string;
  route: DrugRoute;
  // Solvente/diluente (es. "NaCl 0.9%", "Glucosio 5%")
  solvent?: string;
  // Volume finale sacca/flacone (es. "250 ml")
  volume?: string;
  volumeValue?: number;
  volumeUnit?: string;
  // Velocità di infusione (es. "100 ml/h")
  infusionRate?: string;
  // Concentrazione finale calcolata (es. "0.2 mg/ml")
  finalConcentration?: string;
  frequency: string;
}

export interface NormalizedPrescription {
  id: string;
  sourceFormat: SourceFormat;
  patient: PatientInfo;
  drug: DrugInfo;
  priority: Priority;
  requestedAt: Date;
  requiredBy?: Date;
  prescribedBy?: string;
  notes?: string;
}
