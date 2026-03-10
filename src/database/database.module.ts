import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { RoutingFilterEntity } from './entities/routing-filter.entity';
import { AppConfigEntity } from './entities/app-config.entity';
import { PrescriptionEntity } from './entities/prescription.entity';

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
          RoutingFilterEntity,
          AppConfigEntity,
          PrescriptionEntity,
        ],
        synchronize: false,
        timezone: 'Z',
        extra: {
          ssl: false,
        },
      }),
    }),
    TypeOrmModule.forFeature([
      RoutingFilterEntity,
      AppConfigEntity,
      PrescriptionEntity,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
