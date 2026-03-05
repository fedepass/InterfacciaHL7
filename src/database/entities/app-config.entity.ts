import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('app_config')
export class AppConfigEntity {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({
    name: 'default_routing_strategy',
    type: 'enum',
    enum: ['load_balance', 'drug_type', 'urgency_first', 'ward'],
    default: 'drug_type',
  })
  defaultRoutingStrategy: string;

  @Column({ name: 'output_fields', type: 'json', nullable: true })
  outputFields: string[] | null;
}
