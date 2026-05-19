import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DayOfWeek } from '../../common/enums';
import { Professional } from './professional.entity';

@Entity('availabilities')
export class Availability {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Professional, (professional) => professional.availabilities, { onDelete: 'CASCADE' })
  professional!: Professional;

  @Column({ type: 'enum', enum: DayOfWeek })
  dayOfWeek!: DayOfWeek;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({ default: 1 })
  maxConcurrentClients!: number;
}
