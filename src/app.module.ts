import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { json, text } from 'express';

import { DatabaseModule } from './database/database.module';
import { ConfigModule } from './config/config.module';
import { ParsersModule } from './parsers/parsers.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'frontend'),
      serveRoot: '/',
      exclude: ['/api/(.*)'],
    }),
    DatabaseModule,
    ConfigModule,
    ParsersModule,
    DispatcherModule,
    PrescriptionsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        json({ type: ['application/json', 'application/fhir+json'] }),
        text({ type: ['text/plain', 'x-hl7-v2+er7', 'application/xml', 'application/fhir+xml', 'text/xml', 'text/*'] }),
      )
      .forRoutes('*');
  }
}
