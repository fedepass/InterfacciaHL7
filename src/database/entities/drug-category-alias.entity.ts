import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { DrugCategoryEntity } from './drug-category.entity';

@Entity('ana_drug_category_aliases')
export class DrugCategoryAliasEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  alias: string;

  @Column({ name: 'category_code', length: 50 })
  categoryCode: string;

  @Column({ length: 10, default: 'IT' })
  language: string;

  @ManyToOne(() => DrugCategoryEntity, (c) => c.aliases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_code', referencedColumnName: 'code' })
  category: DrugCategoryEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
