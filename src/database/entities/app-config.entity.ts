import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('app_config')
export class AppConfigEntity {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ name: 'output_fields', type: 'json', nullable: true })
  outputFields: string[] | null;
}
