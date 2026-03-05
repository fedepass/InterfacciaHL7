import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CappaEntity } from './cappa.entity';

@Entity('cappa_specializations')
export class CappaSpecEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cappa_id', length: 50 })
  cappaId: string;

  @ManyToOne(() => CappaEntity, (c) => c.specs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cappa_id' })
  cappa: CappaEntity;

  @Column({ length: 100 })
  specialization: string;
}
