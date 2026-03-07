import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { RoutingFilterEntity } from '../database/entities/routing-filter.entity';
import { AppConfigEntity } from '../database/entities/app-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoutingFilterEntity, AppConfigEntity])],
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
