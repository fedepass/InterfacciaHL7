import { Injectable } from '@nestjs/common';
import { ParsersService } from '../parsers/parsers.service';
import { DispatcherService, DispatchResult } from '../dispatcher/dispatcher.service';

const PHARMAR_API = process.env.PHARMAR_API_URL ?? 'http://127.0.0.1:3002';
const PHARMAR_KEY = process.env.PHARMAR_API_KEY ?? '';

function apiHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'X-Api-Key': PHARMAR_KEY };
}

function toPharmarPriority(p: string): string {
  if (p === 'STAT') return 'alta';
  if (p === 'URGENT') return 'media';
  return 'bassa';
}

function fromPharmarPriority(p: string): 'STAT' | 'URGENT' | 'ROUTINE' {
  if (p === 'alta') return 'STAT';
  if (p === 'media') return 'URGENT';
  return 'ROUTINE';
}

function toPharmarPrepType(route?: string): string {
  return route && /IV|infus/i.test(route) ? 'infusione_iv' : 'siringa_ricostituita';
}

function fromPharmarStatus(status: string): 'PENDING' | 'SENT' {
  return status === 'completata' ? 'SENT' : 'PENDING';
}

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly parsersService: ParsersService,
    private readonly dispatcherService: DispatcherService,
  ) {}

  async receive(raw: string, _sourceIp?: string): Promise<DispatchResult> {
    const normalized = this.parsersService.parse(raw);
    const result = this.dispatcherService.dispatch(normalized);

    const body = {
      drug: result.preparation.drug,
      date: result.timestamps.requiredBy
        ? result.timestamps.requiredBy.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      patient_id: result.patient.id,
      patient_name: result.patient.name,
      priority: toPharmarPriority(result.priority),
      prep_type: toPharmarPrepType(result.preparation.route),
      patient_ward: result.patient.ward ?? null,
      dosage: result.preparation.dosage ?? null,
      route: result.preparation.route ?? null,
      volume: result.preparation.volume ?? null,
      notes: result.notes ?? null,
    };

    const res = await fetch(`${PHARMAR_API}/api/v1/preparations`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`pharmar-api error ${res.status}: ${text}`);
    }

    const prep = await res.json() as any;
    result.prescriptionId = prep.id;
    return result;
  }

  async findAll(deliveryStatus?: string): Promise<DispatchResult[]> {
    const res = await fetch(`${PHARMAR_API}/api/v1/preparations?limit=200`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return [];
    const { data } = await res.json() as any;

    const filtered = deliveryStatus
      ? data.filter((p: any) =>
          deliveryStatus.toUpperCase() === 'SENT'
            ? p.status === 'completata'
            : p.status !== 'completata',
        )
      : data;

    return filtered.map((p: any) => this.prepToDispatchResult(p));
  }

  async findOne(id: string): Promise<DispatchResult | undefined> {
    const res = await fetch(`${PHARMAR_API}/api/v1/preparations/${id}`, {
      headers: apiHeaders(),
    });
    if (!res.ok) return undefined;
    const prep = await res.json();
    return this.prepToDispatchResult(prep);
  }

  async markAsSent(id: string): Promise<void> {
    await fetch(`${PHARMAR_API}/api/v1/preparations/${id}`, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ status: 'completata' }),
    });
  }

  private prepToDispatchResult(p: any): DispatchResult {
    return {
      prescriptionId: p.id,
      status: 'DISPATCHED',
      deliveryStatus: fromPharmarStatus(p.status),
      priority: fromPharmarPriority(p.priority),
      sourceFormat: 'HL7V2',
      prescribedBy: undefined,
      notes: p.notes ?? undefined,
      patient: {
        id: p.patient_id,
        name: p.patient_name,
        ward: p.patient_ward ?? '',
        bedNumber: undefined,
      },
      preparation: {
        drug: p.drug,
        category: '',
        dosage: p.dosage ?? '',
        route: p.route ?? '',
        frequency: '',
        dosageValue: undefined,
        dosageUnit: undefined,
        solvent: undefined,
        volume: p.volume ?? undefined,
        volumeValue: undefined,
        volumeUnit: undefined,
        infusionRate: undefined,
        finalConcentration: undefined,
      },
      timestamps: {
        received: p.created_at,
        dispatched: p.created_at,
        requiredBy: p.date ? `${p.date}T00:00:00.000Z` : undefined,
        sentToApi: p.finished_at ?? undefined,
      },
    };
  }
}
