import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { SubscriptionBillingCycle, SubscriptionBillingStatus } from '../../common/enums';
import { Client } from './client.entity';

@Entity('client_billings')
@Unique('UQ_client_billings_cycle_period', ['client', 'cycle', 'referencePeriod'])
export class ClientBilling {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  client!: Client;

  @Column({ type: 'enum', enum: SubscriptionBillingCycle })
  cycle!: SubscriptionBillingCycle;

  @Column({ type: 'date' })
  referencePeriod!: string;

  @Column({ type: 'date' })
  dueDate!: string;

  @Column({ type: 'enum', enum: SubscriptionBillingStatus, default: SubscriptionBillingStatus.PENDING })
  status!: SubscriptionBillingStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt?: Date | null;
}
