import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, ClientBilling, FinancialTransaction, Scheduling } from '../../database/entities';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinancialTransaction, Scheduling, Client, ClientBilling])],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
