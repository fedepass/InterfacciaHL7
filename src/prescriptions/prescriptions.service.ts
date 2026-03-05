import { Injectable } from '@nestjs/common';
import { ParsersService } from '../parsers/parsers.service';
import { DispatcherService, DispatchResult } from '../dispatcher/dispatcher.service';

@Injectable()
export class PrescriptionsService {
  // Storico in-memory (ultime 200 prescrizioni)
  private readonly history: DispatchResult[] = [];

  constructor(
    private readonly parsersService: ParsersService,
    private readonly dispatcherService: DispatcherService,
  ) {}

  receive(raw: string): DispatchResult {
    const normalized = this.parsersService.parse(raw);
    const result = this.dispatcherService.dispatch(normalized);
    this.history.unshift(result);
    if (this.history.length > 200) this.history.pop();
    return result;
  }

  findAll(deliveryStatus?: string, cappaId?: string): DispatchResult[] {
    let results = this.history;
    if (deliveryStatus) {
      const upper = deliveryStatus.toUpperCase();
      results = results.filter(p => p.deliveryStatus === upper);
    }
    if (cappaId) {
      results = results.filter(p => p.assignedCappa.id === cappaId);
    }
    return results;
  }

  findOne(id: string): DispatchResult | undefined {
    return this.history.find(p => p.prescriptionId === id);
  }

  markAsSent(id: string): void {
    const p = this.history.find(r => r.prescriptionId === id);
    if (p) {
      p.deliveryStatus = 'SENT';
      p.timestamps.sentToApi = new Date().toISOString();
    }
  }
}
