import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlanType } from '../../common/enums';
import { User } from './user.entity';
import { Scheduling } from './scheduling.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User)
  @JoinColumn()
  user!: User;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date | null;

  @Column({ type: 'text', nullable: true })
  anamnesis?: string | null;

  @Column({ type: 'varchar', nullable: true })
  emergencyContact?: string | null;

  @Column({ type: 'enum', enum: PlanType })
  plan!: PlanType;

  @Column({ default: 0 })
  creditsRemaining!: number;

  @OneToMany(() => Scheduling, (s) => s.client)
  schedulings!: Scheduling[];
}
