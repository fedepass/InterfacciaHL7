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
exports.DispatcherService = void 0;
const common_1 = require("@nestjs/common");
const routing_engine_1 = require("./routing/routing-engine");
const cappe_service_1 = require("../cappe/cappe.service");
let DispatcherService = class DispatcherService {
    constructor(routingEngine, cappeService) {
        this.routingEngine = routingEngine;
        this.cappeService = cappeService;
    }
    dispatch(prescription) {
        const routing = this.routingEngine.route(prescription);
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
};
exports.DispatcherService = DispatcherService;
exports.DispatcherService = DispatcherService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [routing_engine_1.RoutingEngine,
        cappe_service_1.CappeService])
], DispatcherService);
