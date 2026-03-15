import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { ParsersModule } from '../parsers/parsers.module';
import { DispatcherModule } from '../dispatcher/dispatcher.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ParsersModule, DispatcherModule, ConfigModule],
  providers: [PrescriptionsService],
  controllers: [PrescriptionsController],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
