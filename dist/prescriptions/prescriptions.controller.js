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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrescriptionsController = void 0;
const common_1 = require("@nestjs/common");
const prescriptions_service_1 = require("./prescriptions.service");
const config_service_1 = require("../config/config.service");
let PrescriptionsController = class PrescriptionsController {
    constructor(prescriptionsService, configService) {
        this.prescriptionsService = prescriptionsService;
        this.configService = configService;
    }
    /**
     * Riceve una prescrizione in formato HL7 v2, FHIR JSON o FHIR XML.
     * Content-Type:
     *   - text/plain o x-hl7-v2+er7 → HL7 v2
     *   - application/json o application/fhir+json → FHIR JSON
     *   - application/xml o application/fhir+xml → FHIR XML
     *   - (auto-detect se non specificato)
     */
    async receive(req, res) {
        try {
            let raw;
            if (typeof req.body === 'string') {
                raw = req.body;
            }
            else if (Buffer.isBuffer(req.body)) {
                raw = req.body.toString('utf-8');
            }
            else if (typeof req.body === 'object' && req.body !== null) {
                raw = JSON.stringify(req.body);
            }
            else {
                return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'Body vuoto o non leggibile' });
            }
            this.prescriptionsService.receive(raw);
            return res.status(common_1.HttpStatus.CREATED).send();
        }
        catch (e) {
            const status = e.status ?? common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            return res.status(status).json({ error: e.message });
        }
    }
    findAll(status, cappaId, res) {
        const results = this.prescriptionsService.findAll(status, cappaId);
        const ids = results.map(p => p.prescriptionId);
        const filtered = results.map(p => this.configService.applyOutputFilter(p));
        res.on('finish', () => ids.forEach(id => this.prescriptionsService.markAsSent(id)));
        res.json(filtered);
    }
    findOne(id, res) {
        const p = this.prescriptionsService.findOne(id);
        if (!p) {
            res.status(common_1.HttpStatus.NOT_FOUND).json({ error: `Prescrizione ${id} non trovata` });
            return;
        }
        const filtered = this.configService.applyOutputFilter(p);
        res.on('finish', () => this.prescriptionsService.markAsSent(id));
        res.json(filtered);
    }
};
exports.PrescriptionsController = PrescriptionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PrescriptionsController.prototype, "receive", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('cappaId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PrescriptionsController.prototype, "findOne", null);
exports.PrescriptionsController = PrescriptionsController = __decorate([
    (0, common_1.Controller)('api/prescriptions'),
    __metadata("design:paramtypes", [prescriptions_service_1.PrescriptionsService,
        config_service_1.ConfigService])
], PrescriptionsController);
