import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Scheduling } from './scheduling.entity';
import { User } from './user.entity';

@Entity('internal_notifications')
export class InternalNotification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Scheduling, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedulingId' })
  scheduling?: Scheduling | null;

  @Column({ type: 'varchar', length: 80 })
  type!: string;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
