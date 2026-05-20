import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanType, SubscriptionBillingCycle, SubscriptionBillingStatus } from '../../common/enums';
import { Client, ClientBilling } from '../../database/entities';

export type SubscriptionSnapshotStatus = SubscriptionBillingStatus | 'NOT_APPLICABLE';

export interface ClientSubscriptionSnapshot {
  cycle: SubscriptionBillingCycle | null;
  status: SubscriptionSnapshotStatus;
  isUpToDate: boolean;
  billing: ClientBilling | null;
}

@Injectable()
export class SubscriptionBillingService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepo: Repository<Client>,
    @InjectRepository(ClientBilling)
    private readonly clientBillingsRepo: Repository<ClientBilling>,
  ) {}

  async ensureRecurringBillings(referenceDate: Date): Promise<void> {
    const clients = await this.clientsRepo.find({
      relations: { user: true },
      where: { user: { isActive: true } },
    });

    for (const client of clients) {
      await this.ensureRecurringBillingForClient(client, referenceDate);
    }
  }

  async ensureRecurringBillingForClient(
    client: Client,
    referenceDate: Date,
  ): Promise<ClientBilling | null> {
    const cycle = this.planToCycle(client.plan);
    if (!cycle) return null;

    const referencePeriod = this.referencePeriodForCycle(cycle, referenceDate);
    const dueDate = this.dueDateForCycle(cycle, referenceDate);
    const expectedStatus = this.statusByDueDate(dueDate);

    const existing = await this.clientBillingsRepo.findOne({
      where: { client: { id: client.id }, cycle, referencePeriod },
      relations: { client: true },
    });

    if (!existing) {
      const pending = this.clientBillingsRepo.create({
        client,
        cycle,
        referencePeriod,
        dueDate,
        amount: this.defaultAmountForCycle(cycle).toFixed(2),
        status: expectedStatus,
      });
      return this.clientBillingsRepo.save(pending);
    }

    if (
      existing.status !== SubscriptionBillingStatus.PAID &&
      existing.status !== expectedStatus
    ) {
      existing.status = expectedStatus;
      return this.clientBillingsRepo.save(existing);
    }

    return existing;
  }

  async getClientSubscriptionSnapshot(
    client: Client,
    referenceDate: Date,
  ): Promise<ClientSubscriptionSnapshot> {
    const cycle = this.planToCycle(client.plan);
    if (!cycle) {
      return {
        cycle: null,
        status: 'NOT_APPLICABLE',
        isUpToDate: true,
        billing: null,
      };
    }

    const billing = await this.ensureRecurringBillingForClient(client, referenceDate);
    const status = billing?.status ?? SubscriptionBillingStatus.PENDING;

    return {
      cycle,
      status,
      isUpToDate: status === SubscriptionBillingStatus.PAID,
      billing: billing ?? null,
    };
  }

  planToCycle(plan: PlanType): SubscriptionBillingCycle | null {
    if (plan === PlanType.MONTHLY) return SubscriptionBillingCycle.MONTHLY;
    if (plan === PlanType.QUARTERLY) return SubscriptionBillingCycle.QUARTERLY;
    if (plan === PlanType.ANNUAL) return SubscriptionBillingCycle.ANNUAL;
    return null;
  }

  defaultAmountForCycle(cycle: SubscriptionBillingCycle): number {
    const amountByCycle: Record<SubscriptionBillingCycle, number> = {
      MONTHLY: 320,
      QUARTERLY: 900,
      ANNUAL: 3200,
    };
    return amountByCycle[cycle];
  }

  referencePeriodForCycle(cycle: SubscriptionBillingCycle, referenceDate: Date): string {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    if (cycle === SubscriptionBillingCycle.ANNUAL) {
      return `${year}-01-01`;
    }
    if (cycle === SubscriptionBillingCycle.QUARTERLY) {
      const quarterStartMonth = Math.floor(month / 3) * 3 + 1;
      return `${year}-${`${quarterStartMonth}`.padStart(2, '0')}-01`;
    }
    return `${year}-${`${month + 1}`.padStart(2, '0')}-01`;
  }

  dueDateForCycle(cycle: SubscriptionBillingCycle, referenceDate: Date): string {
    return this.referencePeriodForCycle(cycle, referenceDate);
  }

  statusByDueDate(dueDate: string): SubscriptionBillingStatus {
    const due = new Date(`${dueDate}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return due < now ? SubscriptionBillingStatus.OVERDUE : SubscriptionBillingStatus.PENDING;
  }
}
