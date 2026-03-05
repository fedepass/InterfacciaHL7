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
exports.PrescriptionsService = void 0;
const common_1 = require("@nestjs/common");
const parsers_service_1 = require("../parsers/parsers.service");
const dispatcher_service_1 = require("../dispatcher/dispatcher.service");
let PrescriptionsService = class PrescriptionsService {
    constructor(parsersService, dispatcherService) {
        this.parsersService = parsersService;
        this.dispatcherService = dispatcherService;
        // Storico in-memory (ultime 200 prescrizioni)
        this.history = [];
    }
    receive(raw) {
        const normalized = this.parsersService.parse(raw);
        const result = this.dispatcherService.dispatch(normalized);
        this.history.unshift(result);
        if (this.history.length > 200)
            this.history.pop();
        return result;
    }
    findAll(deliveryStatus, cappaId) {
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
    findOne(id) {
        return this.history.find(p => p.prescriptionId === id);
    }
    markAsSent(id) {
        const p = this.history.find(r => r.prescriptionId === id);
        if (p) {
            p.deliveryStatus = 'SENT';
            p.timestamps.sentToApi = new Date().toISOString();
        }
    }
};
exports.PrescriptionsService = PrescriptionsService;
exports.PrescriptionsService = PrescriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [parsers_service_1.ParsersService,
        dispatcher_service_1.DispatcherService])
], PrescriptionsService);
