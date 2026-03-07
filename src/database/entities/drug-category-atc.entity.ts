import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DrugCategoryEntity } from './drug-category.entity';
import { AtcLevel2Entity } from './atc-level2.entity';

@Entity('ana_drug_category_atc')
export class DrugCategoryAtcEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'drug_category_code', length: 50 })
  drugCategoryCode: string;

  @Column({ name: 'atc_code', length: 5 })
  atcCode: string;

  @ManyToOne(() => DrugCategoryEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'drug_category_code', referencedColumnName: 'code' })
  drugCategory: DrugCategoryEntity;

  @ManyToOne(() => AtcLevel2Entity, (l2) => l2.drugCategoryRelations, { eager: true })
  @JoinColumn({ name: 'atc_code', referencedColumnName: 'code' })
  atcCategory: AtcLevel2Entity;
}
