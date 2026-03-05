import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CappeService } from './cappe.service';
import { CappeController } from './cappe.controller';
import { ConfigModule } from '../config/config.module';
import { CappaQueueEntity } from '../database/entities/cappa-queue.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([CappaQueueEntity])],
  providers: [CappeService],
  controllers: [CappeController],
  exports: [CappeService],
})
export class CappeModule {}
