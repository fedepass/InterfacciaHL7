import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('prescriptions')
export class PrescriptionEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ length: 20, default: 'DISPATCHED' })
  status: string;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: ['PENDING', 'SENT'],
    default: 'PENDING',
  })
  deliveryStatus: string;

  @Column({ type: 'enum', enum: ['STAT', 'URGENT', 'ROUTINE'] })
  priority: string;

  @Column({
    name: 'source_format',
    type: 'enum',
    enum: ['HL7V2', 'FHIR_JSON', 'FHIR_XML', 'CDA_PRF'],
  })
  sourceFormat: string;

  @Column({ name: 'prescribed_by', length: 200, nullable: true })
  prescribedBy: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // Preparazione completa (snapshot JSON)
  @Column({ name: 'preparation', type: 'json' })
  preparation: Record<string, any>;

  // Paziente
  @Column({ name: 'patient_id', length: 100 })
  patientId: string;

  @Column({ name: 'patient_name', length: 200 })
  patientName: string;

  @Column({ name: 'patient_ward', length: 100 })
  patientWard: string;

  @Column({ name: 'patient_bed_number', length: 20, nullable: true })
  patientBedNumber: string | null;

  // Preparazione (colonne principali per query)
  @Column({ name: 'prep_drug', length: 200 })
  prepDrug: string;

  @Column({ name: 'prep_category', length: 100 })
  prepCategory: string;

  @Column({ name: 'prep_dosage', length: 50 })
  prepDosage: string;

  @Column({ name: 'prep_route', length: 50 })
  prepRoute: string;

  @Column({ name: 'prep_frequency', length: 100 })
  prepFrequency: string;

  // Timestamp
  @Column({ name: 'ts_received', type: 'datetime' })
  tsReceived: Date;

  @Column({ name: 'ts_dispatched', type: 'datetime' })
  tsDispatched: Date;

  @Column({ name: 'ts_required_by', type: 'datetime', nullable: true })
  tsRequiredBy: Date | null;

  @Column({ name: 'ts_sent_to_api', type: 'datetime', nullable: true })
  tsSentToApi: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
