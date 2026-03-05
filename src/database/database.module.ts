import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { CappaEntity } from './entities/cappa.entity';
import { CappaSpecEntity } from './entities/cappa-spec.entity';
import { RoutingFilterEntity } from './entities/routing-filter.entity';
import { AppConfigEntity } from './entities/app-config.entity';
import { PrescriptionEntity } from './entities/prescription.entity';
import { CappaQueueEntity } from './entities/cappa-queue.entity';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '3306', 10),
        database: process.env.DB_NAME ?? 'hl7service',
        username: process.env.DB_USER ?? 'hl7user',
        password: process.env.DB_PASSWORD ?? 'hl7password',
        entities: [
          CappaEntity,
          CappaSpecEntity,
          RoutingFilterEntity,
          AppConfigEntity,
          PrescriptionEntity,
          CappaQueueEntity,
        ],
        synchronize: false, // usa schema.sql per la struttura
        timezone: 'Z',
        extra: {
          ssl: false,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      CappaEntity,
      CappaSpecEntity,
      RoutingFilterEntity,
      AppConfigEntity,
      PrescriptionEntity,
      CappaQueueEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
