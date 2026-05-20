import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  FinancialTransactionType,
  PaymentMethod,
  PlanType,
  SchedulingStatus,
  SubscriptionBillingCycle,
  SubscriptionBillingStatus,
} from '../../common/enums';
import { Client, ClientBilling, FinancialTransaction, Scheduling } from '../../database/entities';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { FinanceDashboardQueryDto } from './dto/finance-dashboard-query.dto';
import { ListFinanceTransactionsQueryDto } from './dto/list-finance-transactions-query.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { RegisterSubscriptionPaymentDto } from './dto/register-subscription-payment.dto';

type FinanceTransactionView = Omit<FinancialTransaction, 'amount'> & { amount: number };
type SubscriptionViewStatus = SubscriptionBillingStatus | 'NOT_APPLICABLE';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(FinancialTransaction)
    private readonly transactionRepo: Repository<FinancialTransaction>,
    @InjectRepository(Scheduling)
    private readonly schedulingsRepo: Repository<Scheduling>,
    @InjectRepository(Client)
    private readonly clientsRepo: Repository<Client>,
    @InjectRepository(ClientBilling)
    private readonly clientBillingsRepo: Repository<ClientBilling>,
  ) {}

  async createTransaction(dto: CreateFinanceTransactionDto): Promise<FinanceTransactionView> {
    if (dto.paymentMethod !== PaymentMethod.CREDIT_CARD && dto.installments) {
      throw new BadRequestException('Parcelamento so e permitido para cartao de credito.');
    }

    const relatedClient = dto.clientId
      ? await this.clientsRepo.findOne({ where: { id: dto.clientId } })
      : null;

    if (dto.clientId && !relatedClient) {
      throw new BadRequestException('Cliente informado para o pagamento nao foi encontrado.');
    }

    const transaction = this.transactionRepo.create({
      description: dto.description,
      amount: dto.amount.toFixed(2),
      type: dto.type,
      paymentMethod: dto.paymentMethod,
      cardBrand: dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.cardBrand ?? null : null,
      installments: dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.installments ?? 1 : null,
      category: dto.category?.trim() || null,
      occurredAt: new Date(dto.occurredAt),
      client: relatedClient,
    });

    const created = await this.transactionRepo.save(transaction);
    return this.mapTransaction(created);
  }

  async listTransactions(query: ListFinanceTransactionsQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const qb = this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .orderBy('t.occurredAt', 'DESC')
      .addOrderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.type) qb.andWhere('t.type = :type', { type: query.type });

    const startDate = query.startDate ? this.parseDate(query.startDate) : null;
    const endDate = query.endDate ? this.parseDate(query.endDate, true) : null;

    if (startDate) qb.andWhere('t.occurredAt >= :startDate', { startDate: startDate.toISOString() });
    if (endDate) qb.andWhere('t.occurredAt <= :endDate', { endDate: endDate.toISOString() });
    if (query.search) {
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('t.description ILIKE :search', { search: `%${query.search}%` })
            .orWhere('t.category ILIKE :search', { search: `%${query.search}%` })
            .orWhere('clientUser.name ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.mapTransaction(item)),
      meta: { page, limit, total },
    };
  }

  async getDashboard(query: FinanceDashboardQueryDto) {
    await this.ensureRecurringMockBillings(new Date());

    const startDate = query.startDate ? this.parseDate(query.startDate) : null;
    const endDate = query.endDate ? this.parseDate(query.endDate, true) : null;

    const totalsQb = this.transactionRepo.createQueryBuilder('t');
    const monthlyQb = this.transactionRepo.createQueryBuilder('t');
    const schedulingQb = this.schedulingsRepo.createQueryBuilder('s');

    if (startDate) {
      totalsQb.andWhere('t.occurredAt >= :startDate', { startDate: startDate.toISOString() });
      monthlyQb.andWhere('t.occurredAt >= :startDate', { startDate: startDate.toISOString() });
      schedulingQb.andWhere('s.startAt >= :startDate', { startDate: startDate.toISOString() });
    }
    if (endDate) {
      totalsQb.andWhere('t.occurredAt <= :endDate', { endDate: endDate.toISOString() });
      monthlyQb.andWhere('t.occurredAt <= :endDate', { endDate: endDate.toISOString() });
      schedulingQb.andWhere('s.startAt <= :endDate', { endDate: endDate.toISOString() });
    }

    const [totalsRaw, monthlyRaw, schedulingRaw] = await Promise.all([
      totalsQb
        .select(
          `COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)`,
          'income',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)`,
          'expense',
        )
        .addSelect(`COUNT(t.id)`, 'entries')
        .setParameters({
          income: FinancialTransactionType.INCOME,
          expense: FinancialTransactionType.EXPENSE,
        })
        .getRawOne<{ income: string | null; expense: string | null; entries: string | null }>(),
      monthlyQb
        .select(`to_char(date_trunc('month', t."occurredAt"), 'YYYY-MM')`, 'month')
        .addSelect(
          `COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)`,
          'income',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)`,
          'expense',
        )
        .setParameters({
          income: FinancialTransactionType.INCOME,
          expense: FinancialTransactionType.EXPENSE,
        })
        .groupBy(`date_trunc('month', t."occurredAt")`)
        .orderBy(`date_trunc('month', t."occurredAt")`, 'ASC')
        .getRawMany<{ month: string; income: string | null; expense: string | null }>(),
      schedulingQb
        .select('COUNT(s.id)', 'total')
        .addSelect(
          `COALESCE(SUM(CASE WHEN s.status = :completed THEN 1 ELSE 0 END), 0)`,
          'completed',
        )
        .addSelect(
          `COALESCE(SUM(CASE WHEN s.status = :cancelled THEN 1 ELSE 0 END), 0)`,
          'cancelled',
        )
        .setParameters({
          completed: SchedulingStatus.COMPLETED,
          cancelled: SchedulingStatus.CANCELLED,
        })
        .getRawOne<{ total: string | null; completed: string | null; cancelled: string | null }>(),
    ]);

    const income = this.parseNumber(totalsRaw?.income);
    const expense = this.parseNumber(totalsRaw?.expense);
    const totalSchedulings = this.parseNumber(schedulingRaw?.total);
    const completedSchedulings = this.parseNumber(schedulingRaw?.completed);
    const cancelledSchedulings = this.parseNumber(schedulingRaw?.cancelled);

    return {
      cashflow: {
        income,
        expense,
        balance: Number((income - expense).toFixed(2)),
        entries: this.parseNumber(totalsRaw?.entries),
      },
      schedulings: {
        total: totalSchedulings,
        completed: completedSchedulings,
        cancelled: cancelledSchedulings,
        completionRate: totalSchedulings
          ? Math.round((completedSchedulings / totalSchedulings) * 100)
          : 0,
        cancellationRate: totalSchedulings
          ? Math.round((cancelledSchedulings / totalSchedulings) * 100)
          : 0,
      },
      monthlyFlow: monthlyRaw.map((monthItem) => {
        const monthIncome = this.parseNumber(monthItem.income);
        const monthExpense = this.parseNumber(monthItem.expense);
        return {
          month: monthItem.month,
          income: monthIncome,
          expense: monthExpense,
          balance: Number((monthIncome - monthExpense).toFixed(2)),
        };
      }),
    };
  }

  async listSubscriptions(query: ListSubscriptionsQueryDto) {
    await this.ensureRecurringMockBillings(new Date());

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const clientsQb = this.clientsRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.user', 'u')
      .where('u.isActive = true')
      .orderBy('u.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const totalQb = this.clientsRepo
      .createQueryBuilder('c')
      .leftJoin('c.user', 'u')
      .where('u.isActive = true');

    if (query.search) {
      clientsQb.andWhere('(u.name ILIKE :search OR u.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
      totalQb.andWhere('(u.name ILIKE :search OR u.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [clients, total] = await Promise.all([clientsQb.getMany(), totalQb.getCount()]);
    const now = new Date();
    const clientIds = clients.map((client) => client.id);

    const billings = clientIds.length
      ? await this.clientBillingsRepo.find({
          where: clientIds.map((clientId) => ({ client: { id: clientId } })),
          relations: { client: true },
          order: { dueDate: 'DESC' },
        })
      : [];

    const billingByClient = new Map<string, ClientBilling[]>();
    billings.forEach((item) => {
      const list = billingByClient.get(item.client.id) ?? [];
      list.push(item);
      billingByClient.set(item.client.id, list);
    });

    const items = clients
      .map((client) => {
        const cycle = this.planToCycle(client.plan);
        const currentPeriod = cycle ? this.referencePeriodForCycle(cycle, now) : null;
        const clientBillingList = billingByClient.get(client.id) ?? [];
        const currentBilling =
          cycle && currentPeriod
            ? clientBillingList.find(
                (item) => item.cycle === cycle && item.referencePeriod === currentPeriod,
              ) ?? null
            : null;
        const paidBilling = clientBillingList.find((item) => item.status === SubscriptionBillingStatus.PAID);

        const status: SubscriptionViewStatus = cycle
          ? currentBilling?.status ?? SubscriptionBillingStatus.PENDING
          : 'NOT_APPLICABLE';

        return {
          clientId: client.id,
          clientName: client.user.name,
          clientEmail: client.user.email,
          plan: client.plan,
          cycle,
          status,
          isUpToDate: status === SubscriptionBillingStatus.PAID || status === 'NOT_APPLICABLE',
          dueDate: currentBilling?.dueDate ?? null,
          amount: currentBilling ? this.parseNumber(currentBilling.amount) : null,
          lastPaymentAt: paidBilling?.paidAt ?? null,
        };
      })
      .filter((item) => (query.status ? item.status === query.status : true));

    return {
      items,
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async registerSubscriptionPayment(clientId: string, dto: RegisterSubscriptionPaymentDto) {
    const client = await this.clientsRepo.findOne({
      where: { id: clientId },
      relations: { user: true },
    });

    if (!client) {
      throw new BadRequestException('Cliente nao encontrado para registrar mensalidade.');
    }

    const cycle = this.planToCycle(client.plan);
    if (!cycle) {
      throw new BadRequestException('Plano do cliente nao possui cobranca recorrente.');
    }

    await this.ensureRecurringMockBillings(new Date());

    const now = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const referencePeriod = this.referencePeriodForCycle(cycle, now);
    const dueDate = this.dueDateForCycle(cycle, now);
    const amount = dto.amount ?? this.defaultAmountForCycle(cycle);

    let billing = await this.clientBillingsRepo.findOne({
      where: { client: { id: client.id }, cycle, referencePeriod },
      relations: { client: true },
    });

    if (!billing) {
      billing = this.clientBillingsRepo.create({
        client,
        cycle,
        referencePeriod,
        dueDate,
        amount: amount.toFixed(2),
        status: SubscriptionBillingStatus.PENDING,
      });
    }

    if (billing.status === SubscriptionBillingStatus.PAID) {
      throw new BadRequestException('Mensalidade/plano deste periodo ja esta em dia.');
    }

    const transaction = await this.transactionRepo.save(
      this.transactionRepo.create({
        description:
          dto.description?.trim() ||
          `${this.cycleLabel(cycle)} - ${client.user.name}`,
        amount: amount.toFixed(2),
        type: FinancialTransactionType.INCOME,
        paymentMethod: dto.paymentMethod,
        cardBrand: dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.cardBrand ?? null : null,
        installments:
          dto.paymentMethod === PaymentMethod.CREDIT_CARD ? dto.installments ?? 1 : null,
        category: this.cycleCategory(cycle),
        occurredAt: now,
        client,
      }),
    );

    billing.status = SubscriptionBillingStatus.PAID;
    billing.paidAt = now;
    billing.amount = amount.toFixed(2);
    await this.clientBillingsRepo.save(billing);

    return {
      billing: {
        id: billing.id,
        status: billing.status,
        dueDate: billing.dueDate,
        paidAt: billing.paidAt,
        amount: this.parseNumber(billing.amount),
      },
      transaction: this.mapTransaction(transaction),
    };
  }

  private parseDate(value: string, isEndDate = false): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Data invalida.');
    }

    if (isEndDate && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      parsed.setHours(23, 59, 59, 999);
    }
    return parsed;
  }

  private parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? 0 : asNumber;
  }

  private mapTransaction(item: FinancialTransaction): FinanceTransactionView {
    return { ...item, amount: this.parseNumber(item.amount) };
  }

  private async ensureRecurringMockBillings(referenceDate: Date): Promise<void> {
    const clients = await this.clientsRepo.find({
      relations: { user: true },
      where: {
        user: { isActive: true },
      },
    });

    for (const client of clients) {
      const cycle = this.planToCycle(client.plan);
      if (!cycle) continue;

      const referencePeriod = this.referencePeriodForCycle(cycle, referenceDate);
      const dueDate = this.dueDateForCycle(cycle, referenceDate);
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
          status: this.statusByDueDate(dueDate),
        });
        await this.clientBillingsRepo.save(pending);
        continue;
      }

      if (
        existing.status !== SubscriptionBillingStatus.PAID &&
        existing.status !== this.statusByDueDate(existing.dueDate)
      ) {
        existing.status = this.statusByDueDate(existing.dueDate);
        await this.clientBillingsRepo.save(existing);
      }
    }
  }

  private planToCycle(plan: PlanType): SubscriptionBillingCycle | null {
    if (plan === PlanType.MONTHLY) return SubscriptionBillingCycle.MONTHLY;
    if (plan === PlanType.QUARTERLY) return SubscriptionBillingCycle.QUARTERLY;
    if (plan === PlanType.ANNUAL) return SubscriptionBillingCycle.ANNUAL;
    return null;
  }

  private defaultAmountForCycle(cycle: SubscriptionBillingCycle): number {
    const amountByCycle: Record<SubscriptionBillingCycle, number> = {
      MONTHLY: 320,
      QUARTERLY: 900,
      ANNUAL: 3200,
    };
    return amountByCycle[cycle];
  }

  private referencePeriodForCycle(cycle: SubscriptionBillingCycle, referenceDate: Date): string {
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

  private dueDateForCycle(cycle: SubscriptionBillingCycle, referenceDate: Date): string {
    return this.referencePeriodForCycle(cycle, referenceDate);
  }

  private statusByDueDate(dueDate: string): SubscriptionBillingStatus {
    const due = new Date(`${dueDate}T00:00:00`);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return due < now ? SubscriptionBillingStatus.OVERDUE : SubscriptionBillingStatus.PENDING;
  }

  private cycleCategory(cycle: SubscriptionBillingCycle): string {
    if (cycle === SubscriptionBillingCycle.ANNUAL) return 'Plano anual';
    if (cycle === SubscriptionBillingCycle.QUARTERLY) return 'Plano trimestral';
    return 'Mensalidade';
  }

  private cycleLabel(cycle: SubscriptionBillingCycle): string {
    if (cycle === SubscriptionBillingCycle.ANNUAL) return 'Plano anual';
    if (cycle === SubscriptionBillingCycle.QUARTERLY) return 'Plano trimestral';
    return 'Mensalidade';
  }
}
