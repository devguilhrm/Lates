import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CancellationType, SchedulingStatus } from '../../common/enums';
import { Client } from './client.entity';
import { Professional } from './professional.entity';
import { User } from './user.entity';

@Entity('schedulings')
export class Scheduling {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Client, (client) => client.schedulings, { eager: true })
  client!: Client;

  @ManyToOne(() => Professional, (professional) => professional.schedulings, { eager: true })
  professional!: Professional;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  createdBy?: User | null;

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

  @Column({ type: 'enum', enum: CancellationType, nullable: true })
  cancellationType?: CancellationType | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
