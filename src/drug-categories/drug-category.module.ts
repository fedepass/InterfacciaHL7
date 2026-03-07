import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrugCategoryEntity } from '../database/entities/drug-category.entity';
import { DrugCategoryAliasEntity } from '../database/entities/drug-category-alias.entity';
import { DrugCategoryAtcEntity } from '../database/entities/drug-category-atc.entity';
import { AtcLevel1Entity } from '../database/entities/atc-level1.entity';
import { AtcLevel2Entity } from '../database/entities/atc-level2.entity';
import { DrugCategoryService } from './drug-category.service';
import { DrugCategoryController } from './drug-category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([
    DrugCategoryEntity,
    DrugCategoryAliasEntity,
    DrugCategoryAtcEntity,
    AtcLevel1Entity,
    AtcLevel2Entity,
  ])],
  providers: [DrugCategoryService],
  controllers: [DrugCategoryController],
  exports: [DrugCategoryService],
})
export class DrugCategoryModule {}
