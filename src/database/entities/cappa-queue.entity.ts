import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('cappa_queue')
export class CappaQueueEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cappa_id', length: 50 })
  cappaId: string;

  @Column({ name: 'prescription_id', length: 36 })
  prescriptionId: string;

  @Column({ name: 'patient_name', length: 200 })
  patientName: string;

  @Column({ name: 'drug_name', length: 200 })
  drugName: string;

  @Column({ length: 20 })
  priority: string;

  @Column({
    name: 'assigned_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  assignedAt: Date;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING',
  })
  status: string;
}
