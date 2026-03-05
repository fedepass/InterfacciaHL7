import { Module } from '@nestjs/common';
import { DispatcherService } from './dispatcher.service';
import { RoutingEngine } from './routing/routing-engine';
import { CappeModule } from '../cappe/cappe.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [CappeModule, ConfigModule],
  providers: [DispatcherService, RoutingEngine],
  exports: [DispatcherService],
})
export class DispatcherModule {}
