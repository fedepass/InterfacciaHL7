import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ParsersService } from '../parsers/parsers.service';
import { DispatcherService, DispatchResult } from '../dispatcher/dispatcher.service';
import { PrescriptionEntity } from '../database/entities/prescription.entity';
import { IncomingMessageEntity } from '../database/entities/incoming-message.entity';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly parsersService: ParsersService,
    private readonly dispatcherService: DispatcherService,
    @InjectRepository(PrescriptionEntity)
    private readonly prescriptionRepo: Repository<PrescriptionEntity>,
    @InjectRepository(IncomingMessageEntity)
    private readonly incomingRepo: Repository<IncomingMessageEntity>,
  ) {}

  async receive(raw: string, sourceIp?: string): Promise<DispatchResult> {
    const detectedFormat = this.parsersService.detectFormat(raw.trim());
    const logEntry: Partial<IncomingMessageEntity> = {
      id: uuidv4(),
      rawPayload: raw,
      detectedFormat,
      sourceIp: sourceIp ?? null,
      parseStatus: 'SUCCESS',
      errorMessage: null,
      prescriptionId: null,
    };

    let result: DispatchResult;
    try {
      const normalized = this.parsersService.parse(raw);
      result = this.dispatcherService.dispatch(normalized);
      await this.prescriptionRepo.save(this.toEntity(result));
      logEntry.prescriptionId = result.prescriptionId;
    } catch (e) {
      logEntry.parseStatus = 'ERROR';
      logEntry.errorMessage = e.message ?? String(e);
      await this.incomingRepo.save(logEntry);
      throw e;
    }

    await this.incomingRepo.save(logEntry);
    return result;
  }

  async findAll(deliveryStatus?: string): Promise<DispatchResult[]> {
    const qb = this.prescriptionRepo
      .createQueryBuilder('p')
      .orderBy('p.tsDispatched', 'DESC')
      .take(200);

    if (deliveryStatus) {
      qb.andWhere('p.deliveryStatus = :ds', { ds: deliveryStatus.toUpperCase() });
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
      patientId: r.patient.id,
      patientName: r.patient.name,
      patientWard: r.patient.ward,
      patientBedNumber: r.patient.bedNumber ?? null,
      prepDrug: r.preparation.drug,
      prepCategory: r.preparation.category,
      prepCode: r.preparation.code ?? null,
      prepDosage: r.preparation.dosage,
      prepDosageValue: r.preparation.dosageValue ?? null,
      prepDosageUnit: r.preparation.dosageUnit ?? null,
      prepRoute: r.preparation.route,
      prepSolvent: r.preparation.solvent ?? null,
      prepVolume: r.preparation.volume ?? null,
      prepVolumeValue: r.preparation.volumeValue ?? null,
      prepVolumeUnit: r.preparation.volumeUnit ?? null,
      prepInfusionRate: r.preparation.infusionRate ?? null,
      prepFinalConcentration: r.preparation.finalConcentration ?? null,
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
      patient: {
        id: e.patientId,
        name: e.patientName,
        ward: e.patientWard,
        bedNumber: e.patientBedNumber ?? undefined,
      },
      preparation: {
        drug: e.prepDrug,
        category: e.prepCategory,
        code: e.prepCode ?? undefined,
        dosage: e.prepDosage,
        dosageValue: e.prepDosageValue != null ? Number(e.prepDosageValue) : undefined,
        dosageUnit: e.prepDosageUnit ?? undefined,
        route: e.prepRoute,
        solvent: e.prepSolvent ?? undefined,
        volume: e.prepVolume ?? undefined,
        volumeValue: e.prepVolumeValue != null ? Number(e.prepVolumeValue) : undefined,
        volumeUnit: e.prepVolumeUnit ?? undefined,
        infusionRate: e.prepInfusionRate ?? undefined,
        finalConcentration: e.prepFinalConcentration ?? undefined,
        frequency: e.prepFrequency,
      },
      timestamps: {
        received: e.tsReceived?.toISOString(),
        dispatched: e.tsDispatched?.toISOString(),
        requiredBy: e.tsRequiredBy?.toISOString(),
        sentToApi: e.tsSentToApi?.toISOString(),
      },
    };
  }
}
