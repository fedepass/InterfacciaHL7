"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bodyParser: false, // gestiamo noi i parser nel middleware
    });
    app.enableCors({ origin: '*' });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`\n🏥 Servizio HL7 Farmacia avviato su http://localhost:${port}`);
    console.log(`   API:    http://localhost:${port}/api/prescriptions`);
    console.log(`   Web UI: http://localhost:${port}/\n`);
}
bootstrap();
