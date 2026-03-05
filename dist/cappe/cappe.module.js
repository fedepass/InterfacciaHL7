"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CappeModule = void 0;
const common_1 = require("@nestjs/common");
const cappe_service_1 = require("./cappe.service");
const cappe_controller_1 = require("./cappe.controller");
const config_module_1 = require("../config/config.module");
let CappeModule = class CappeModule {
};
exports.CappeModule = CappeModule;
exports.CappeModule = CappeModule = __decorate([
    (0, common_1.Module)({
        imports: [config_module_1.ConfigModule],
        providers: [cappe_service_1.CappeService],
        controllers: [cappe_controller_1.CappeController],
        exports: [cappe_service_1.CappeService],
    })
], CappeModule);
