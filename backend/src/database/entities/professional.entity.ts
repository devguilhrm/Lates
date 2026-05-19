import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { Availability } from './availability.entity';
import { Scheduling } from './scheduling.entity';

@Entity('professionals')
export class Professional {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ length: 80 })
  specialty: string;

  @Column({ nullable: true })
  bio: string;

  @OneToMany(() => Availability, (a) => a.professional)
  availabilities: Availability[];

  @OneToMany(() => Scheduling, (s) => s.professional)
  schedulings: Scheduling[];
}
