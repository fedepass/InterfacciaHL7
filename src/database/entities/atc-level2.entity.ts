import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { AtcLevel1Entity } from './atc-level1.entity';
import { DrugCategoryAtcEntity } from './drug-category-atc.entity';

@Entity('ana_atc_level2')
export class AtcLevel2Entity {
  @PrimaryColumn({ type: 'varchar', length: 5 })
  code: string;

  @Column({ name: 'name_en', length: 200 })
  nameEn: string;

  @Column({ name: 'name_it', length: 200 })
  nameIt: string;

  @Column({ name: 'level1_code', type: 'char', length: 1 })
  level1Code: string;

  @ManyToOne(() => AtcLevel1Entity, (l1) => l1.subgroups, { eager: true })
  @JoinColumn({ name: 'level1_code', referencedColumnName: 'code' })
  level1: AtcLevel1Entity;

  @OneToMany(() => DrugCategoryAtcEntity, (r) => r.atcCategory, { eager: false })
  drugCategoryRelations: DrugCategoryAtcEntity[];
}
