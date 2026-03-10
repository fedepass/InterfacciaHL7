import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { RoutingFilterEntity } from '../database/entities/routing-filter.entity';
import { AppConfigEntity } from '../database/entities/app-config.entity';
import { AnaOutputFieldEntity } from '../database/entities/ana-output-field.entity';
import { AppConfigOutputFieldEntity } from '../database/entities/app-config-output-field.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoutingFilterEntity, AppConfigEntity, AnaOutputFieldEntity, AppConfigOutputFieldEntity])],
  providers: [ConfigService],
  controllers: [ConfigController],
  exports: [ConfigService],
})
export class ConfigModule {}
