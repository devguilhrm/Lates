import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, ClientBilling } from '../../database/entities';
import { SubscriptionBillingService } from './subscription-billing.service';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientBilling])],
  providers: [SubscriptionBillingService],
  exports: [SubscriptionBillingService],
})
export class BillingModule {}
