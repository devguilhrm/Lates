import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { PlanType, SubscriptionBillingStatus } from '../../common/enums';
import { Client, ClientBilling } from '../../database/entities';
import { SubscriptionBillingService } from './subscription-billing.service';

describe('SubscriptionBillingService', () => {
  let service: SubscriptionBillingService;
  let clientsRepo: { find: jest.Mock };
  let clientBillingsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    clientsRepo = {
      find: jest.fn(),
    };
    clientBillingsRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionBillingService,
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: getRepositoryToken(ClientBilling), useValue: clientBillingsRepo },
      ],
    }).compile();

    service = module.get(SubscriptionBillingService);
  });

  it('deve retornar NOT_APPLICABLE para plano sem recorrencia', async () => {
    const snapshot = await service.getClientSubscriptionSnapshot(
      {
        id: 'c1',
        plan: PlanType.CREDIT_PACK,
      } as Client,
      new Date('2026-05-20T12:00:00.000Z'),
    );

    expect(snapshot.status).toBe('NOT_APPLICABLE');
    expect(snapshot.isUpToDate).toBe(true);
    expect(snapshot.cycle).toBeNull();
    expect(snapshot.billing).toBeNull();
  });

  it('deve criar cobranca recorrente quando nao existir registro do periodo', async () => {
    const client = {
      id: 'c1',
      plan: PlanType.MONTHLY,
    } as Client;
    clientBillingsRepo.findOne.mockResolvedValue(null);
    clientBillingsRepo.create.mockImplementation((payload) => payload);
    clientBillingsRepo.save.mockImplementation(async (payload) => payload);

    const created = await service.ensureRecurringBillingForClient(
      client,
      new Date('2000-05-20T12:00:00.000Z'),
    );

    expect(clientBillingsRepo.create).toHaveBeenCalledTimes(1);
    expect(created?.referencePeriod).toBe('2000-05-01');
    expect(created?.status).toBe(SubscriptionBillingStatus.OVERDUE);
  });

  it('deve atualizar status para OVERDUE quando vencimento passou e ainda nao foi pago', async () => {
    const client = {
      id: 'c1',
      plan: PlanType.MONTHLY,
    } as Client;
    const existing = {
      client,
      cycle: 'MONTHLY',
      referencePeriod: '2000-01-01',
      dueDate: '2000-01-01',
      status: SubscriptionBillingStatus.PENDING,
    } as unknown as ClientBilling;

    clientBillingsRepo.findOne.mockResolvedValue(existing);
    clientBillingsRepo.save.mockImplementation(async (payload) => payload);

    const updated = await service.ensureRecurringBillingForClient(
      client,
      new Date('2000-01-20T12:00:00.000Z'),
    );

    expect(clientBillingsRepo.save).toHaveBeenCalledTimes(1);
    expect(updated?.status).toBe(SubscriptionBillingStatus.OVERDUE);
  });
});
