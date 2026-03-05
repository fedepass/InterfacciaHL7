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
exports.ConfigController = void 0;
const common_1 = require("@nestjs/common");
const config_service_1 = require("./config.service");
let ConfigController = class ConfigController {
    constructor(configService) {
        this.configService = configService;
    }
    getConfig() {
        return this.configService.getConfig();
    }
    setStrategy(body) {
        this.configService.setDefaultStrategy(body.strategy);
        return { defaultRoutingStrategy: body.strategy };
    }
    getFilters() {
        return this.configService.getFilters();
    }
    addFilter(dto) {
        return this.configService.addFilter(dto);
    }
    updateFilter(id, dto) {
        const result = this.configService.updateFilter(id, dto);
        if (!result)
            throw new common_1.NotFoundException(`Filtro ${id} non trovato`);
        return result;
    }
    removeFilter(id) {
        const ok = this.configService.removeFilter(id);
        if (!ok)
            throw new common_1.NotFoundException(`Filtro ${id} non trovato`);
        return { message: `Filtro ${id} rimosso` };
    }
    getOutputFields() {
        return { enabledFields: this.configService.getOutputFields() };
    }
    setOutputFields(body) {
        this.configService.setOutputFields(body.enabledFields ?? null);
        return { enabledFields: this.configService.getOutputFields() };
    }
};
exports.ConfigController = ConfigController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)('strategy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "setStrategy", null);
__decorate([
    (0, common_1.Get)('filters'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getFilters", null);
__decorate([
    (0, common_1.Post)('filters'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "addFilter", null);
__decorate([
    (0, common_1.Put)('filters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "updateFilter", null);
__decorate([
    (0, common_1.Delete)('filters/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "removeFilter", null);
__decorate([
    (0, common_1.Get)('output-fields'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "getOutputFields", null);
__decorate([
    (0, common_1.Put)('output-fields'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ConfigController.prototype, "setOutputFields", null);
exports.ConfigController = ConfigController = __decorate([
    (0, common_1.Controller)('api/config'),
    __metadata("design:paramtypes", [config_service_1.ConfigService])
], ConfigController);
