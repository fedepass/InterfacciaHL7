import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService, CappaType, CappaStatus } from '../config/config.service';

export interface Cappa {
  id: string;
  name: string;
  description?: string;
  type: CappaType;
  active: boolean;
  status: CappaStatus;
  maxQueueSize: number;
  specializations: string[];
  queue: CappaQueueItem[];
}

export interface CappaQueueItem {
  prescriptionId: string;
  patientName: string;
  drugName: string;
  priority: string;
  assignedAt: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface CreateCappaDto {
  name: string;
  description?: string;
  type?: CappaType;
  maxQueueSize?: number;
  specializations?: string[];
}

export interface UpdateCappaDto {
  name?: string;
  description?: string;
  type?: CappaType;
  active?: boolean;
  status?: CappaStatus;
  maxQueueSize?: number;
  specializations?: string[];
}

@Injectable()
export class CappeService {
  // Queue in-memory: persistenza della coda (non salvata su disco)
  private readonly queues = new Map<string, CappaQueueItem[]>();

  constructor(private readonly configService: ConfigService) {}

  findAll(): Cappa[] {
    return this.configService.getCappe().map(c => ({
      ...c,
      queue: this.queues.get(c.id) ?? [],
    }));
  }

  findOne(id: string): Cappa {
    const cappa = this.configService.getCappe().find(c => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    return { ...cappa, queue: this.queues.get(id) ?? [] };
  }

  create(dto: CreateCappaDto): Cappa {
    const cappe = this.configService.getCappe();
    if (cappe.find(c => c.name === dto.name)) {
      throw new ConflictException(`Cappa con nome "${dto.name}" esiste già`);
    }
    const newCappa = {
      id: `CAPPA_${uuidv4().substring(0, 8).toUpperCase()}`,
      name: dto.name,
      description: dto.description ?? '',
      type: dto.type ?? ('ALTRO' as CappaType),
      active: true,
      status: 'ONLINE' as CappaStatus,
      maxQueueSize: dto.maxQueueSize ?? 0,
      specializations: dto.specializations ?? [],
    };
    this.configService.addCappa(newCappa);
    this.queues.set(newCappa.id, []);
    return { ...newCappa, queue: [] };
  }

  update(id: string, dto: UpdateCappaDto): Cappa {
    const cappa = this.configService.getCappe().find(c => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    const updated = { ...cappa, ...dto };
    this.configService.updateCappa(id, updated);
    return { ...updated, queue: this.queues.get(id) ?? [] };
  }

  remove(id: string): void {
    const cappa = this.configService.getCappe().find(c => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    this.configService.removeCappa(id);
    this.queues.delete(id);
  }

  getQueue(id: string): CappaQueueItem[] {
    if (!this.configService.getCappe().find(c => c.id === id)) {
      throw new NotFoundException(`Cappa ${id} non trovata`);
    }
    return this.queues.get(id) ?? [];
  }

  addToQueue(cappaId: string, item: Omit<CappaQueueItem, 'assignedAt' | 'status'>): CappaQueueItem {
    const cappa = this.configService.getCappe().find(c => c.id === cappaId);
    const maxQ = cappa?.maxQueueSize ?? 0;
    if (maxQ > 0 && this.getQueueLength(cappaId) >= maxQ) {
      throw new BadRequestException(
        `Cappa ${cappaId} ha raggiunto la capacità massima di ${maxQ} preparazioni`,
      );
    }
    const entry: CappaQueueItem = { ...item, assignedAt: new Date(), status: 'PENDING' };
    if (!this.queues.has(cappaId)) this.queues.set(cappaId, []);
    this.queues.get(cappaId)!.push(entry);
    return entry;
  }

  getQueueLength(cappaId: string): number {
    return (this.queues.get(cappaId) ?? []).filter(i => i.status !== 'COMPLETED').length;
  }

  updateQueueItemStatus(cappaId: string, prescriptionId: string, status: 'IN_PROGRESS' | 'COMPLETED'): void {
    const queue = this.queues.get(cappaId) ?? [];
    const item = queue.find(i => i.prescriptionId === prescriptionId);
    if (item) item.status = status;
  }

  // Restituisce cappe eleggibili per il routing:
  // active=true AND status=ONLINE AND coda non piena (se maxQueueSize > 0)
  getActiveCappe() {
    return this.configService.getCappe().filter(c => {
      if (!c.active) return false;
      if ((c.status ?? 'ONLINE') !== 'ONLINE') return false;
      const maxQ = c.maxQueueSize ?? 0;
      if (maxQ > 0 && this.getQueueLength(c.id) >= maxQ) return false;
      return true;
    });
  }
}
