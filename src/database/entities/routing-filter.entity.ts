import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('routing_filters')
export class RoutingFilterEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ name: 'condition_drug_cats', type: 'json', nullable: true })
  conditionDrugCats: string[] | null;

  @Column({ name: 'condition_ward', length: 100, nullable: true })
  conditionWard: string | null;

  @Column({
    name: 'condition_urgency',
    type: 'enum',
    enum: ['STAT', 'URGENT'],
    nullable: true,
  })
  conditionUrgency: 'STAT' | 'URGENT' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
