"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CappeService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const config_service_1 = require("../config/config.service");
let CappeService = class CappeService {
    constructor(configService) {
        this.configService = configService;
        // Queue in-memory: persistenza della coda (non salvata su disco)
        this.queues = new Map();
    }
    findAll() {
        return this.configService.getCappe().map(c => ({
            ...c,
            queue: this.queues.get(c.id) ?? [],
        }));
    }
    findOne(id) {
        const cappa = this.configService.getCappe().find(c => c.id === id);
        if (!cappa)
            throw new common_1.NotFoundException(`Cappa ${id} non trovata`);
        return { ...cappa, queue: this.queues.get(id) ?? [] };
    }
    create(dto) {
        const cappe = this.configService.getCappe();
        if (cappe.find(c => c.name === dto.name)) {
            throw new common_1.ConflictException(`Cappa con nome "${dto.name}" esiste già`);
        }
        const newCappa = {
            id: `CAPPA_${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`,
            name: dto.name,
            description: dto.description ?? '',
            type: dto.type ?? 'ALTRO',
            active: true,
            status: 'ONLINE',
            maxQueueSize: dto.maxQueueSize ?? 0,
            specializations: dto.specializations ?? [],
        };
        this.configService.addCappa(newCappa);
        this.queues.set(newCappa.id, []);
        return { ...newCappa, queue: [] };
    }
    update(id, dto) {
        const cappa = this.configService.getCappe().find(c => c.id === id);
        if (!cappa)
            throw new common_1.NotFoundException(`Cappa ${id} non trovata`);
        const updated = { ...cappa, ...dto };
        this.configService.updateCappa(id, updated);
        return { ...updated, queue: this.queues.get(id) ?? [] };
    }
    remove(id) {
        const cappa = this.configService.getCappe().find(c => c.id === id);
        if (!cappa)
            throw new common_1.NotFoundException(`Cappa ${id} non trovata`);
        this.configService.removeCappa(id);
        this.queues.delete(id);
    }
    getQueue(id) {
        if (!this.configService.getCappe().find(c => c.id === id)) {
            throw new common_1.NotFoundException(`Cappa ${id} non trovata`);
        }
        return this.queues.get(id) ?? [];
    }
    addToQueue(cappaId, item) {
        const cappa = this.configService.getCappe().find(c => c.id === cappaId);
        const maxQ = cappa?.maxQueueSize ?? 0;
        if (maxQ > 0 && this.getQueueLength(cappaId) >= maxQ) {
            throw new common_1.BadRequestException(`Cappa ${cappaId} ha raggiunto la capacità massima di ${maxQ} preparazioni`);
        }
        const entry = { ...item, assignedAt: new Date(), status: 'PENDING' };
        if (!this.queues.has(cappaId))
            this.queues.set(cappaId, []);
        this.queues.get(cappaId).push(entry);
        return entry;
    }
    getQueueLength(cappaId) {
        return (this.queues.get(cappaId) ?? []).filter(i => i.status !== 'COMPLETED').length;
    }
    updateQueueItemStatus(cappaId, prescriptionId, status) {
        const queue = this.queues.get(cappaId) ?? [];
        const item = queue.find(i => i.prescriptionId === prescriptionId);
        if (item)
            item.status = status;
    }
    // Restituisce cappe eleggibili per il routing:
    // active=true AND status=ONLINE AND coda non piena (se maxQueueSize > 0)
    getActiveCappe() {
        return this.configService.getCappe().filter(c => {
            if (!c.active)
                return false;
            if ((c.status ?? 'ONLINE') !== 'ONLINE')
                return false;
            const maxQ = c.maxQueueSize ?? 0;
            if (maxQ > 0 && this.getQueueLength(c.id) >= maxQ)
                return false;
            return true;
        });
    }
};
exports.CappeService = CappeService;
exports.CappeService = CappeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService])
], CappeService);
