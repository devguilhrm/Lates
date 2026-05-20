import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { CardBrand, FinancialTransactionType, PaymentMethod } from '../../common/enums';
import { Client } from './client.entity';

@Entity('financial_transactions')
export class FinancialTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 140 })
  description!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: FinancialTransactionType })
  type!: FinancialTransactionType;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.PIX })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'enum', enum: CardBrand, nullable: true })
  cardBrand?: CardBrand | null;

  @Column({ type: 'int', nullable: true })
  installments?: number | null;

  @Column({ type: 'varchar', nullable: true })
  category?: string | null;

  @Column({ type: 'int', nullable: true })
  creditQuantity?: number | null;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  client?: Client | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
