import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { FinancialTransactionType, PaymentMethod } from '../../common/enums';
import { Client, ClientBilling, FinancialTransaction, Scheduling } from '../../database/entities';
import { SubscriptionBillingService } from '../billing/subscription-billing.service';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let transactionRepo: { create: jest.Mock; save: jest.Mock };
  let clientsRepo: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    transactionRepo = {
      create: jest.fn((payload) => payload),
      save: jest.fn(async (payload) => ({ id: 'tx-1', ...payload })),
    };
    clientsRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (payload) => payload),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: getRepositoryToken(FinancialTransaction), useValue: transactionRepo },
        { provide: getRepositoryToken(Scheduling), useValue: {} },
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: getRepositoryToken(ClientBilling), useValue: {} },
        {
          provide: SubscriptionBillingService,
          useValue: {
            ensureRecurringBillings: jest.fn(),
            planToCycle: jest.fn(),
            referencePeriodForCycle: jest.fn(),
            dueDateForCycle: jest.fn(),
            defaultAmountForCycle: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FinanceService);
  });

  it('deve exigir cliente para lancamento de pacote de creditos', async () => {
    await expect(
      service.createTransaction({
        description: 'Pacote de creditos - maio',
        amount: 650,
        type: FinancialTransactionType.INCOME,
        paymentMethod: PaymentMethod.PIX,
        category: 'Pacote de creditos',
        occurredAt: '2026-05-20T10:00:00.000Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve somar creditos do cliente ao registrar pacote de creditos', async () => {
    const client = {
      id: 'client-1',
      creditsRemaining: 3,
    } as Client;
    clientsRepo.findOne.mockResolvedValue(client);

    const result = await service.createTransaction({
      description: 'Pacote de creditos - junho',
      amount: 650,
      type: FinancialTransactionType.INCOME,
      paymentMethod: PaymentMethod.PIX,
      category: 'Pacote de creditos',
      occurredAt: '2026-06-01T10:00:00.000Z',
      clientId: client.id,
      creditQuantity: 12,
    });

    expect(result.amount).toBe(650);
    expect(client.creditsRemaining).toBe(15);
    expect(clientsRepo.save).toHaveBeenCalledTimes(1);
    expect(transactionRepo.save).toHaveBeenCalledTimes(1);
  });
});
