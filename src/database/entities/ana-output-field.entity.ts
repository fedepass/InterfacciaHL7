import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ana_output_fields')
export class AnaOutputFieldEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'field_path', length: 100, unique: true })
  fieldPath: string;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'group_name', length: 50, default: 'Generale' })
  groupName: string;

  @Column({ length: 255, nullable: true })
  description: string | null;

  @Column({ default: false })
  required: boolean;

  @Column({ name: 'sort_order', type: 'smallint', default: 0 })
  sortOrder: number;
}
