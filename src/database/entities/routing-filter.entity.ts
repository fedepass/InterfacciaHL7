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

  @Column({ name: 'target_cappa_id', length: 50, nullable: true })
  targetCappaId: string | null;

  @Column({ name: 'fallback_to_default', default: false })
  fallbackToDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
