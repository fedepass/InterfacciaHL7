import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('app_config_output_fields')
export class AppConfigOutputFieldEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'field_path', length: 100, unique: true })
  fieldPath: string;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
