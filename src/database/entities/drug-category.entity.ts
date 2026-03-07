import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { DrugCategoryAliasEntity } from './drug-category-alias.entity';
import { DrugCategoryAtcEntity } from './drug-category-atc.entity';

@Entity('ana_drug_categories')
export class DrugCategoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ name: 'label', length: 100 })
  label: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => DrugCategoryAliasEntity, (a) => a.category, { cascade: true, eager: true })
  aliases: DrugCategoryAliasEntity[];

  @OneToMany(() => DrugCategoryAtcEntity, (r) => r.drugCategory, { eager: true })
  atcMappings: DrugCategoryAtcEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
