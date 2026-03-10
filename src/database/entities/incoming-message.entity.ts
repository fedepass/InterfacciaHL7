import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('incoming_messages')
export class IncomingMessageEntity {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'raw_payload', type: 'mediumtext' })
  rawPayload: string;

  @Column({
    name: 'detected_format',
    type: 'enum',
    enum: ['HL7V2', 'FHIR_JSON', 'FHIR_XML', 'CDA_PRF', 'UNKNOWN'],
    default: 'UNKNOWN',
  })
  detectedFormat: string;

  @Column({ name: 'source_ip', length: 45, nullable: true })
  sourceIp: string | null;

  @Column({
    name: 'parse_status',
    type: 'enum',
    enum: ['SUCCESS', 'ERROR'],
    default: 'SUCCESS',
  })
  parseStatus: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'prescription_id', length: 36, nullable: true })
  prescriptionId: string | null;

  @CreateDateColumn({ name: 'received_at' })
  receivedAt: Date;
}
