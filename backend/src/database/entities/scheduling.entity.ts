import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SchedulingStatus } from '../../common/enums';
import { Client } from './client.entity';
import { Professional } from './professional.entity';

@Entity('schedulings')
export class Scheduling {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Client, (client) => client.schedulings, { eager: true })
  client!: Client;

  @ManyToOne(() => Professional, (professional) => professional.schedulings, { eager: true })
  professional!: Professional;

  @Column({ type: 'timestamptz' })
  startAt!: Date;

  @Column({ type: 'timestamptz' })
  endAt!: Date;

  @Column({ type: 'enum', enum: SchedulingStatus, default: SchedulingStatus.SCHEDULED })
  status!: SchedulingStatus;

  @Column({ type: 'varchar', nullable: true })
  notes?: string | null;

  @Column({ type: 'varchar', nullable: true })
  cancellationReason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
