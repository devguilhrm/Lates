import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column({ nullable: true })
  refreshTokenHash?: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role!: UserRole;

  @Column({ nullable: true })
  phone?: string | null;

  @Column({ nullable: true })
  avatarUrl?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
