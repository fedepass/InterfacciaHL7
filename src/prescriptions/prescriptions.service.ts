import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParsersService } from '../parsers/parsers.service';
import { DispatcherService, DispatchResult } from '../dispatcher/dispatcher.service';
import { PrescriptionEntity } from '../database/entities/prescription.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly parsersService: ParsersService,
    private readonly dispatcherService: DispatcherService,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionRepo: Repository<PrescriptionEntity>,
  ) {}

  async receive(raw: string): Promise<DispatchResult> {
    const normalized = this.parsersService.parse(raw);
    const result = this.dispatcherService.dispatch(normalized);
    await this.prescriptionRepo.save(this.toEntity(result));
    return result;
  }

  async findAll(deliveryStatus?: string, cappaId?: string): Promise<DispatchResult[]> {
    const qb = this.prescriptionRepo
      .createQueryBuilder('p')
      .orderBy('p.tsDispatched', 'DESC')
      .take(200);

    if (deliveryStatus) {
      qb.andWhere('p.deliveryStatus = :ds', { ds: deliveryStatus.toUpperCase() });
    }
    if (cappaId) {
      qb.andWhere('p.assignedCappaId = :cappaId', { cappaId });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.toDispatchResult(e));
  }

  async findOne(id: string): Promise<DispatchResult | undefined> {
    const entity = await this.prescriptionRepo.findOne({ where: { id } });
    return entity ? this.toDispatchResult(entity) : undefined;
  }

  async markAsSent(id: string): Promise<void> {
    await this.prescriptionRepo.update(id, {
      deliveryStatus: 'SENT',
      tsSentToApi: new Date(),
    });
  }

  // ── Conversioni ──────────────────────────────────────────────

  private toEntity(r: DispatchResult): Partial<PrescriptionEntity> {
    return {
      id: r.prescriptionId,
      status: r.status,
      deliveryStatus: r.deliveryStatus,
      priority: r.priority,
      sourceFormat: r.sourceFormat,
      prescribedBy: r.prescribedBy ?? null,
      notes: r.notes ?? null,
      assignedCappaId: r.assignedCappa.id,
      assignedCappa: r.assignedCappa as unknown as Record<string, any>,
      routingInfo: r.routingInfo as unknown as Record<string, any>,
      preparation: r.preparation as unknown as Record<string, any>,
      patientId: r.patient.id,
      patientName: r.patient.name,
      patientWard: r.patient.ward,
      patientBedNumber: r.patient.bedNumber ?? null,
      prepDrug: r.preparation.drug,
      prepCategory: r.preparation.category,
      prepDosage: r.preparation.dosage,
      prepRoute: r.preparation.route,
      prepFrequency: r.preparation.frequency,
      tsReceived: new Date(r.timestamps.received),
      tsDispatched: new Date(r.timestamps.dispatched),
      tsRequiredBy: r.timestamps.requiredBy ? new Date(r.timestamps.requiredBy) : null,
      tsSentToApi: r.timestamps.sentToApi ? new Date(r.timestamps.sentToApi) : null,
    };
  }

  private toDispatchResult(e: PrescriptionEntity): DispatchResult {
    return {
      prescriptionId: e.id,
      status: 'DISPATCHED',
      deliveryStatus: e.deliveryStatus as 'PENDING' | 'SENT',
      priority: e.priority as any,
      sourceFormat: e.sourceFormat as any,
      prescribedBy: e.prescribedBy ?? undefined,
      notes: e.notes ?? undefined,
      assignedCappa: e.assignedCappa as any,
      routingInfo: e.routingInfo as any,
      patient: {
        id: e.patientId,
        name: e.patientName,
        ward: e.patientWard,
        bedNumber: e.patientBedNumber ?? undefined,
      },
      preparation: e.preparation as any,
      timestamps: {
        received: e.tsReceived?.toISOString(),
        dispatched: e.tsDispatched?.toISOString(),
        requiredBy: e.tsRequiredBy?.toISOString(),
        sentToApi: e.tsSentToApi?.toISOString(),
      },
    };
  }
}
