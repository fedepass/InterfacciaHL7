import { Injectable } from '@nestjs/common';
import { NormalizedPrescription } from '../common/dto/normalized-prescription.dto';

export interface DispatchResult {
  prescriptionId: string;
  status: 'DISPATCHED';
  deliveryStatus: 'PENDING' | 'SENT';
  priority: string;
  sourceFormat: string;
  prescribedBy?: string;
  notes?: string;
  patient: {
    id: string;
    name: string;
    ward: string;
    bedNumber?: string;
  };
  preparation: {
    drug: string;
    category: string;
    code?: string;
    dosage: string;
    dosageValue?: number;
    dosageUnit?: string;
    route: string;
    solvent?: string;
    volume?: string;
    volumeValue?: number;
    volumeUnit?: string;
    infusionRate?: string;
    finalConcentration?: string;
    frequency: string;
  };
  timestamps: {
    received: string;
    dispatched: string;
    sentToApi?: string;
    requiredBy?: string;
  };
}

@Injectable()
export class DispatcherService {
  dispatch(prescription: NormalizedPrescription): DispatchResult {
    return {
      prescriptionId: prescription.id,
      status: 'DISPATCHED',
      deliveryStatus: 'PENDING',
      priority: prescription.priority,
      sourceFormat: prescription.sourceFormat,
      prescribedBy: prescription.prescribedBy,
      notes: prescription.notes,
      patient: {
        id: prescription.patient.id,
        name: prescription.patient.name,
        ward: prescription.patient.ward,
        bedNumber: prescription.patient.bedNumber,
      },
      preparation: {
        drug: prescription.drug.name,
        category: prescription.drug.category,
        code: prescription.drug.code,
        dosage: prescription.drug.dosage,
        dosageValue: prescription.drug.dosageValue,
        dosageUnit: prescription.drug.dosageUnit,
        route: prescription.drug.route,
        solvent: prescription.drug.solvent,
        volume: prescription.drug.volume,
        volumeValue: prescription.drug.volumeValue,
        volumeUnit: prescription.drug.volumeUnit,
        infusionRate: prescription.drug.infusionRate,
        finalConcentration: prescription.drug.finalConcentration,
        frequency: prescription.drug.frequency,
      },
      timestamps: {
        received: prescription.requestedAt.toISOString(),
        dispatched: new Date().toISOString(),
        requiredBy: prescription.requiredBy?.toISOString(),
      },
    };
  }
}
