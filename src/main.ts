import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
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
