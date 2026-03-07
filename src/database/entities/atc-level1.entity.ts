import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { AtcLevel2Entity } from './atc-level2.entity';

@Entity('ana_atc_level1')
export class AtcLevel1Entity {
  @PrimaryColumn({ type: 'char', length: 1 })
  code: string;

  @Column({ name: 'name_en', length: 150 })
  nameEn: string;

  @Column({ name: 'name_it', length: 150 })
  nameIt: string;

  @OneToMany(() => AtcLevel2Entity, (l2) => l2.level1, { eager: false })
  subgroups: AtcLevel2Entity[];
}
