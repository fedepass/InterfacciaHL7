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

  // Paziente
  @Column({ name: 'patient_id', length: 100 })
  patientId: string;

  @Column({ name: 'patient_name', length: 200 })
  patientName: string;

  @Column({ name: 'patient_ward', length: 100 })
  patientWard: string;

  @Column({ name: 'patient_bed_number', length: 20, nullable: true })
  patientBedNumber: string | null;

  // Preparazione farmaco — tutti i campi decodificati
  @Column({ name: 'prep_drug', length: 200 })
  prepDrug: string;

  @Column({ name: 'prep_category', length: 100 })
  prepCategory: string;

  @Column({ name: 'prep_code', length: 50, nullable: true })
  prepCode: string | null;

  @Column({ name: 'prep_dosage', length: 50 })
  prepDosage: string;

  @Column({ name: 'prep_dosage_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  prepDosageValue: number | null;

  @Column({ name: 'prep_dosage_unit', length: 30, nullable: true })
  prepDosageUnit: string | null;

  @Column({ name: 'prep_route', length: 50 })
  prepRoute: string;

  @Column({ name: 'prep_solvent', length: 100, nullable: true })
  prepSolvent: string | null;

  @Column({ name: 'prep_volume', length: 30, nullable: true })
  prepVolume: string | null;

  @Column({ name: 'prep_volume_value', type: 'decimal', precision: 10, scale: 3, nullable: true })
  prepVolumeValue: number | null;

  @Column({ name: 'prep_volume_unit', length: 20, nullable: true })
  prepVolumeUnit: string | null;

  @Column({ name: 'prep_infusion_rate', length: 50, nullable: true })
  prepInfusionRate: string | null;

  @Column({ name: 'prep_final_concentration', length: 50, nullable: true })
  prepFinalConcentration: string | null;

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
