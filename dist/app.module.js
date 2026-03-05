"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const path = __importStar(require("path"));
const express_1 = require("express");
const config_module_1 = require("./config/config.module");
const cappe_module_1 = require("./cappe/cappe.module");
const parsers_module_1 = require("./parsers/parsers.module");
const dispatcher_module_1 = require("./dispatcher/dispatcher.module");
const prescriptions_module_1 = require("./prescriptions/prescriptions.module");
let AppModule = class AppModule {
    configure(consumer) {
        // Parsing body flessibile: JSON, testo plain (HL7 v2), XML
        consumer
            .apply((0, express_1.json)({ type: ['application/json', 'application/fhir+json'] }), (0, express_1.text)({ type: ['text/plain', 'x-hl7-v2+er7', 'application/xml', 'application/fhir+xml', 'text/xml', 'text/*'] }))
            .forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: path.join(process.cwd(), 'frontend'),
                serveRoot: '/',
                exclude: ['/api/(.*)'],
            }),
            config_module_1.ConfigModule,
            cappe_module_1.CappeModule,
            parsers_module_1.ParsersModule,
            dispatcher_module_1.DispatcherModule,
            prescriptions_module_1.PrescriptionsModule,
        ],
    })
], AppModule);
