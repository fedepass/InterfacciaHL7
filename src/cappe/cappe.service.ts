import { Injectable, NotFoundException, ConflictException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService, CappaType, CappaStatus } from '../config/config.service';
import { CappaQueueEntity } from '../database/entities/cappa-queue.entity';

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
export class CappeService implements OnModuleInit {
  // Cache in-memory per lunghezze coda (usata dal RoutingEngine in modo sincrono)
  private readonly queueLengthCache = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(CappaQueueEntity)
    private readonly queueRepo: Repository<CappaQueueEntity>,
  ) {}

  async onModuleInit() {
    try {
      await this.loadQueueCacheFromDb();
    } catch (e) {
      console.error('Impossibile caricare code dal DB:', e.message);
    }
  }

  private async loadQueueCacheFromDb() {
    const cappe = this.configService.getCappe();
    for (const c of cappe) {
      const count = await this.queueRepo.count({
        where: { cappaId: c.id, status: Not('COMPLETED') as any },
      });
      this.queueLengthCache.set(c.id, count);
    }
  }

  // ── Lettura cappe ────────────────────────────────────────────

  findAll(): (Cappa & { queueLength: number })[] {
    return this.configService.getCappe().map((c) => ({
      ...c,
      queue: [],
      queueLength: this.queueLengthCache.get(c.id) ?? 0,
    }));
  }

  findOne(id: string): Cappa & { queueLength: number } {
    const cappa = this.configService.getCappe().find((c) => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    return { ...cappa, queue: [], queueLength: this.queueLengthCache.get(id) ?? 0 };
  }

  // ── CRUD cappe ───────────────────────────────────────────────

  create(dto: CreateCappaDto): Cappa {
    const cappe = this.configService.getCappe();
    if (cappe.find((c) => c.name === dto.name)) {
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
    this.queueLengthCache.set(newCappa.id, 0);
    return { ...newCappa, queue: [] };
  }

  update(id: string, dto: UpdateCappaDto): Cappa {
    const cappa = this.configService.getCappe().find((c) => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    const updated = { ...cappa, ...dto };
    this.configService.updateCappa(id, updated);
    return { ...updated, queue: [] };
  }

  remove(id: string): void {
    const cappa = this.configService.getCappe().find((c) => c.id === id);
    if (!cappa) throw new NotFoundException(`Cappa ${id} non trovata`);
    this.configService.removeCappa(id);
    this.queueLengthCache.delete(id);
    this.queueRepo
      .delete({ cappaId: id })
      .catch((e) => console.error('DB error remove queue:', e.message));
  }

  // ── Gestione coda ────────────────────────────────────────────

  async getQueue(id: string): Promise<CappaQueueItem[]> {
    if (!this.configService.getCappe().find((c) => c.id === id)) {
      throw new NotFoundException(`Cappa ${id} non trovata`);
    }
    const entities = await this.queueRepo.find({
      where: { cappaId: id },
      order: { assignedAt: 'ASC' },
    });
    return entities.map((e) => this.entityToQueueItem(e));
  }

  addToQueue(cappaId: string, item: Omit<CappaQueueItem, 'assignedAt' | 'status'>): CappaQueueItem {
    const cappa = this.configService.getCappe().find((c) => c.id === cappaId);
    const maxQ = cappa?.maxQueueSize ?? 0;
    if (maxQ > 0 && this.getQueueLength(cappaId) >= maxQ) {
      throw new BadRequestException(
        `Cappa ${cappaId} ha raggiunto la capacità massima di ${maxQ} preparazioni`,
      );
    }

    const entry: CappaQueueItem = { ...item, assignedAt: new Date(), status: 'PENDING' };

    // Aggiorna cache sincrona
    this.queueLengthCache.set(cappaId, (this.queueLengthCache.get(cappaId) ?? 0) + 1);

    // Persiste sul DB
    this.queueRepo
      .save({
        cappaId,
        prescriptionId: item.prescriptionId,
        patientName: item.patientName,
        drugName: item.drugName,
        priority: item.priority,
        assignedAt: entry.assignedAt,
        status: 'PENDING',
      })
      .catch((e) => console.error('DB error addToQueue:', e.message));

    return entry;
  }

  // Sincrono: legge dalla cache (usato da RoutingEngine)
  getQueueLength(cappaId: string): number {
    return this.queueLengthCache.get(cappaId) ?? 0;
  }

  updateQueueItemStatus(cappaId: string, prescriptionId: string, status: 'IN_PROGRESS' | 'COMPLETED'): void {
    if (status === 'COMPLETED') {
      const current = this.queueLengthCache.get(cappaId) ?? 0;
      this.queueLengthCache.set(cappaId, Math.max(0, current - 1));
    }
    this.queueRepo
      .update({ cappaId, prescriptionId }, { status })
      .catch((e) => console.error('DB error updateQueueItemStatus:', e.message));
  }

  // Restituisce cappe eleggibili per il routing (sincrono, per RoutingEngine)
  getActiveCappe() {
    return this.configService.getCappe().filter((c) => {
      if (!c.active) return false;
      if ((c.status ?? 'ONLINE') !== 'ONLINE') return false;
      const maxQ = c.maxQueueSize ?? 0;
      if (maxQ > 0 && this.getQueueLength(c.id) >= maxQ) return false;
      return true;
    });
  }

  private entityToQueueItem(e: CappaQueueEntity): CappaQueueItem {
    return {
      prescriptionId: e.prescriptionId,
      patientName: e.patientName,
      drugName: e.drugName,
      priority: e.priority,
      assignedAt: e.assignedAt,
      status: e.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
    };
  }
}
