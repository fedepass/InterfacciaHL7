import {
  Entity, PrimaryColumn, Column, OneToMany,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { CappaSpecEntity } from './cappa-spec.entity';

@Entity('cappe')
export class CappaEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['FLUSSO_LAMINARE_VERTICALE', 'FLUSSO_LAMINARE_ORIZZONTALE', 'ISOLATORE', 'BSC', 'CHIMICA', 'DISPENSAZIONE', 'ALTRO'],
    default: 'ALTRO',
  })
  type: string;

  @Column({ default: true })
  active: boolean;

  @Column({
    type: 'enum',
    enum: ['ONLINE', 'OFFLINE', 'MANUTENZIONE', 'GUASTO'],
    default: 'ONLINE',
  })
  status: string;

  @Column({ name: 'max_queue_size', default: 0 })
  maxQueueSize: number;

  @OneToMany(() => CappaSpecEntity, (s) => s.cappa, { cascade: true, eager: true })
  specs: CappaSpecEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
