import { Injectable } from '@nestjs/common';
import { NormalizedPrescription } from '../common/dto/normalized-prescription.dto';
import { RoutingEngine, RoutingResult } from './routing/routing-engine';
import { CappeService } from '../cappe/cappe.service';

export interface DispatchResult {
  prescriptionId: string;
  status: 'DISPATCHED';
  deliveryStatus: 'PENDING' | 'SENT';
  priority: string;
  sourceFormat: string;
  prescribedBy?: string;
  notes?: string;
  assignedCappa: {
    id: string;
    name: string;
    description?: string;
    type: string;
    status: string;
    specializations: string[];
    queueLength: number;   // elementi in coda al momento del dispatch (incluso quello appena aggiunto)
    maxQueueSize: number;  // 0 = illimitata
  };
  routingInfo: {
    appliedFilter: string | null;
    fallbackUsed: boolean;
    defaultStrategy: string;
  };
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
  constructor(
    private readonly routingEngine: RoutingEngine,
    private readonly cappeService: CappeService,
  ) {}

  dispatch(prescription: NormalizedPrescription): DispatchResult {
    const routing: RoutingResult = this.routingEngine.route(prescription);

    // Aggiunge alla coda della cappa selezionata
    this.cappeService.addToQueue(routing.cappaId, {
      prescriptionId: prescription.id,
      patientName: prescription.patient.name,
      drugName: prescription.drug.name,
      priority: prescription.priority,
    });

    // Legge i dati aggiornati della cappa (inclusa la nuova lunghezza coda)
    const cappa = this.cappeService.findOne(routing.cappaId);

    return {
      prescriptionId: prescription.id,
      status: 'DISPATCHED',
      deliveryStatus: 'PENDING',
      priority: prescription.priority,
      sourceFormat: prescription.sourceFormat,
      prescribedBy: prescription.prescribedBy,
      notes: prescription.notes,
      assignedCappa: {
        id: cappa.id,
        name: cappa.name,
        description: cappa.description,
        type: cappa.type ?? 'ALTRO',
        status: cappa.status ?? 'ONLINE',
        specializations: cappa.specializations ?? [],
        queueLength: this.cappeService.getQueueLength(cappa.id),
        maxQueueSize: cappa.maxQueueSize ?? 0,
      },
      routingInfo: {
        appliedFilter: routing.appliedFilter,
        fallbackUsed: routing.fallbackUsed,
        defaultStrategy: routing.defaultStrategy,
      },
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
