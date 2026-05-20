import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  FinancialTransactionType,
  PaymentChannel,
  PaymentMethod,
  SchedulingStatus,
  SubscriptionBillingCycle,
  SubscriptionBillingStatus,
} from '../../common/enums';
import { Client, ClientBilling, FinancialTransaction, Scheduling } from '../../database/entities';
import { SubscriptionBillingService } from '../billing/subscription-billing.service';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { FinanceDashboardQueryDto } from './dto/finance-dashboard-query.dto';
import { ListFinanceTransactionsQueryDto } from './dto/list-finance-transactions-query.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { RegisterSubscriptionPaymentDto } from './dto/register-subscription-payment.dto';

type FinanceTransactionView = Omit<FinancialTransaction, 'amount'> & { amount: number };
type SubscriptionViewStatus = SubscriptionBillingStatus | 'NOT_APPLICABLE';
type ClientSubscriptionBillingView = {
  billingId: string;
  plan: Client['plan'];
  cycle: SubscriptionBillingCycle;
  referencePeriod: string;
  dueDate: string;
  status: SubscriptionBillingStatus;
  amount: number;
  creditsRemaining: number;
};

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
    private readonly subscriptionBillingService: SubscriptionBillingService,
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
    if (this.isCreditPackCategory(dto.category) && !relatedClient) {
      throw new BadRequestException(
        'Para registrar pacote de creditos e obrigatorio selecionar o cliente.',
      );
    }

    const created = await this.saveTransaction({
      description: dto.description,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      cardBrand: dto.cardBrand,
      installments: dto.installments,
      category: dto.category,
      occurredAt: new Date(dto.occurredAt),
      type: dto.type,
      client: relatedClient,
      creditQuantity: dto.creditQuantity,
    });

    await this.applyCreditPackIfNeeded({
      category: dto.category,
      type: dto.type,
      client: relatedClient,
      creditQuantity: dto.creditQuantity,
    });

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
    await this.subscriptionBillingService.ensureRecurringBillings(new Date());

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
    await this.subscriptionBillingService.ensureRecurringBillings(new Date());

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
          relations: { client: true, paymentTransaction: true },
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
        const cycle = this.subscriptionBillingService.planToCycle(client.plan);
        const currentPeriod = cycle
          ? this.subscriptionBillingService.referencePeriodForCycle(cycle, now)
          : null;
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
          creditsRemaining: client.creditsRemaining,
          cycle,
          status,
          isUpToDate: status === SubscriptionBillingStatus.PAID || status === 'NOT_APPLICABLE',
          dueDate: currentBilling?.dueDate ?? null,
          amount: currentBilling ? this.parseNumber(currentBilling.amount) : null,
          lastPaymentAt: paidBilling?.paidAt ?? null,
          lastPaymentTransactionId: paidBilling?.paymentTransaction?.id ?? null,
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

    const cycle = this.subscriptionBillingService.planToCycle(client.plan);
    if (!cycle) {
      throw new BadRequestException('Plano do cliente nao possui cobranca recorrente.');
    }

    await this.subscriptionBillingService.ensureRecurringBillings(new Date());

    const now = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const referencePeriod = this.subscriptionBillingService.referencePeriodForCycle(cycle, now);
    const dueDate = this.subscriptionBillingService.dueDateForCycle(cycle, now);
    const amount = dto.amount ?? this.subscriptionBillingService.defaultAmountForCycle(cycle);

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

    const transaction = await this.saveTransaction({
      description: dto.description?.trim() || `${this.cycleLabel(cycle)} - ${client.user.name}`,
      amount,
      paymentMethod: dto.paymentMethod,
      cardBrand: dto.cardBrand,
      installments: dto.installments,
      category: this.cycleCategory(cycle),
      occurredAt: now,
      type: FinancialTransactionType.INCOME,
      client,
    });

    billing.status = SubscriptionBillingStatus.PAID;
    billing.paidAt = now;
    billing.amount = amount.toFixed(2);
    billing.paymentTransaction = transaction;
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

  async listMySubscriptions(userId: string) {
    await this.subscriptionBillingService.ensureRecurringBillings(new Date());
    const client = await this.findClientByUserId(userId);
    const cycle = this.subscriptionBillingService.planToCycle(client.plan);
    if (!cycle) return { items: [] as ClientSubscriptionBillingView[] };

    const billings = await this.clientBillingsRepo.find({
      where: { client: { id: client.id }, cycle },
      relations: { client: true },
      order: { dueDate: 'DESC' },
      take: 12,
    });

    return {
      items: billings.map((billing) => ({
        billingId: billing.id,
        plan: client.plan,
        cycle,
        referencePeriod: billing.referencePeriod,
        dueDate: billing.dueDate,
        status: billing.status,
        amount: this.parseNumber(billing.amount),
        creditsRemaining: client.creditsRemaining,
      })),
    };
  }

  async generateMySubscriptionPaymentCode(
    userId: string,
    billingId: string,
    paymentMethod: PaymentMethod = PaymentMethod.PIX,
    paymentChannel: PaymentChannel = PaymentChannel.APP_QR,
  ) {
    const { client, billing } = await this.resolveClientOwnedBilling(userId, billingId);

    if (billing.status === SubscriptionBillingStatus.PAID) {
      throw new BadRequestException('Mensalidade deste periodo ja esta em dia.');
    }

    const paymentCode = this.generatePaymentCode(billing, paymentMethod, paymentChannel);
    const qrCodePayload = paymentMethod === PaymentMethod.PIX ? `PIX|${paymentCode}` : null;

    return {
      billing: {
        id: billing.id,
        dueDate: billing.dueDate,
        status: billing.status,
        amount: this.parseNumber(billing.amount),
      },
      client: {
        id: client.id,
        name: client.user.name,
        creditsRemaining: client.creditsRemaining,
      },
      payment: {
        paymentMethod,
        paymentChannel,
        paymentCode,
        qrCodePayload,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    };
  }

  async payMySubscriptionByBillingId(
    userId: string,
    billingId: string,
    dto: RegisterSubscriptionPaymentDto,
  ) {
    const { client, billing } = await this.resolveClientOwnedBilling(userId, billingId);
    if (billing.status === SubscriptionBillingStatus.PAID) {
      throw new BadRequestException('Mensalidade deste periodo ja esta em dia.');
    }

    const now = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const amount = dto.amount ?? this.parseNumber(billing.amount);
    const transaction = await this.saveTransaction({
      description:
        dto.description?.trim() ||
        `${this.cycleLabel(billing.cycle)} - ${client.user.name}`,
      amount,
      paymentMethod: dto.paymentMethod,
      cardBrand: dto.cardBrand,
      installments: dto.installments,
      category: this.cycleCategory(billing.cycle),
      occurredAt: now,
      type: FinancialTransactionType.INCOME,
      client,
    });

    billing.status = SubscriptionBillingStatus.PAID;
    billing.paidAt = now;
    billing.amount = amount.toFixed(2);
    billing.paymentTransaction = transaction;
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
      metadata: {
        paymentChannel: dto.paymentChannel ?? PaymentChannel.APP_QR,
      },
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

  private async findClientByUserId(userId: string): Promise<Client> {
    const client = await this.clientsRepo.findOne({
      where: { user: { id: userId } },
      relations: { user: true },
    });
    if (!client) throw new BadRequestException('Perfil de cliente nao encontrado para o usuario.');
    return client;
  }

  private async resolveClientOwnedBilling(userId: string, billingId: string) {
    const client = await this.findClientByUserId(userId);
    const billing = await this.clientBillingsRepo.findOne({
      where: { id: billingId, client: { id: client.id } },
      relations: { client: true },
    });

    if (!billing) {
      throw new BadRequestException('Cobranca de mensalidade nao encontrada para este cliente.');
    }

    return { client, billing };
  }

  private generatePaymentCode(
    billing: ClientBilling,
    method: PaymentMethod,
    channel: PaymentChannel,
  ): string {
    const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `LTS-${billing.id.slice(0, 8).toUpperCase()}-${method}-${channel}-${suffix}`;
  }

  private async saveTransaction(params: {
    description: string;
    amount: number;
    paymentMethod: PaymentMethod;
    cardBrand?: CreateFinanceTransactionDto['cardBrand'];
    installments?: number;
    category?: string;
    occurredAt: Date;
    type: FinancialTransactionType;
    client?: Client | null;
    creditQuantity?: number;
  }): Promise<FinancialTransaction> {
    const transaction = this.transactionRepo.create({
      description: params.description,
      amount: params.amount.toFixed(2),
      type: params.type,
      paymentMethod: params.paymentMethod,
      cardBrand:
        params.paymentMethod === PaymentMethod.CREDIT_CARD ? params.cardBrand ?? null : null,
      installments:
        params.paymentMethod === PaymentMethod.CREDIT_CARD ? params.installments ?? 1 : null,
      category: params.category?.trim() || null,
      occurredAt: params.occurredAt,
      client: params.client ?? null,
      creditQuantity:
        this.isCreditPackCategory(params.category) && params.type === FinancialTransactionType.INCOME
          ? params.creditQuantity ?? 10
          : null,
    });

    return this.transactionRepo.save(transaction);
  }

  private async applyCreditPackIfNeeded(params: {
    category?: string;
    type: FinancialTransactionType;
    client?: Client | null;
    creditQuantity?: number;
  }): Promise<void> {
    if (!this.isCreditPackCategory(params.category)) return;
    if (params.type !== FinancialTransactionType.INCOME) return;
    if (!params.client) return;

    const quantity = params.creditQuantity ?? 10;
    params.client.creditsRemaining += quantity;
    await this.clientsRepo.save(params.client);
  }

  private isCreditPackCategory(category?: string | null): boolean {
    return (category ?? '').trim().toLowerCase() === 'pacote de creditos';
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
