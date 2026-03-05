import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { ParsersModule } from '../parsers/parsers.module';
import { DispatcherModule } from '../dispatcher/dispatcher.module';
import { ConfigModule } from '../config/config.module';
import { PrescriptionEntity } from '../database/entities/prescription.entity';

@Module({
  imports: [ParsersModule, DispatcherModule, ConfigModule, TypeOrmModule.forFeature([PrescriptionEntity])],
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
