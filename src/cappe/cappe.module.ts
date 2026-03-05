import { Module } from '@nestjs/common';
import { CappeService } from './cappe.service';
import { CappeController } from './cappe.controller';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [CappeService],
  controllers: [CappeController],
  exports: [CappeService],
})
export class CappeModule {}
