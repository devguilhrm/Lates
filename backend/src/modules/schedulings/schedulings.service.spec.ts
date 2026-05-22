import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { CancellationType, DayOfWeek, UserRole } from '../../common/enums';
import { Availability, Client, Professional, Scheduling, User } from '../../database/entities';
import { SubscriptionBillingService } from '../billing/subscription-billing.service';
import { InternalNotificationsService } from '../notifications/internal-notifications.service';
import { SchedulingEventsPublisher } from './events/scheduling-events.publisher';
import { SchedulingsService } from './schedulings.service';

function createCountQueryBuilder(count: number) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
    getOne: jest.fn().mockResolvedValue(null),
  };
}

function createConflictQueryBuilder(conflict: object | null) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getOne: jest.fn().mockResolvedValue(conflict),
  };
}

function dayOfWeekFromDate(date: Date): DayOfWeek {
  const map: DayOfWeek[] = [
    DayOfWeek.SUN,
    DayOfWeek.MON,
    DayOfWeek.TUE,
    DayOfWeek.WED,
    DayOfWeek.THU,
    DayOfWeek.FRI,
    DayOfWeek.SAT,
  ];
  return map[date.getDay()];
}

function createFutureBusinessSlot() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  return { start, end };
}

describe('SchedulingsService', () => {
  let service: SchedulingsService;
  let schedulingRepo: {
    createQueryBuilder: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let availabilityRepo: { find: jest.Mock };
  let clientRepo: { findOne: jest.Mock; save: jest.Mock };
  let professionalRepo: { findOne: jest.Mock };
  let userRepo: { findOne: jest.Mock };
  let schedulingEventsPublisher: {
    publishCreated: jest.Mock;
    publishCancelled: jest.Mock;
    publishCheckedIn: jest.Mock;
  };
  let subscriptionBillingService: { getClientSubscriptionSnapshot: jest.Mock };
  let internalNotificationsService: { notifyReceptionAboutClientScheduling: jest.Mock };

  beforeEach(async () => {
    schedulingRepo = {
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    availabilityRepo = {
      find: jest.fn(),
    };
    clientRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    professionalRepo = {
      findOne: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    schedulingEventsPublisher = {
      publishCreated: jest.fn(),
      publishCancelled: jest.fn(),
      publishCheckedIn: jest.fn(),
    };
    subscriptionBillingService = {
      getClientSubscriptionSnapshot: jest.fn(),
    };
    internalNotificationsService = {
      notifyReceptionAboutClientScheduling: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingsService,
        { provide: getRepositoryToken(Scheduling), useValue: schedulingRepo },
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Professional), useValue: professionalRepo },
        { provide: getRepositoryToken(Availability), useValue: availabilityRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: SchedulingEventsPublisher,
          useValue: schedulingEventsPublisher,
        },
        {
          provide: SubscriptionBillingService,
          useValue: subscriptionBillingService,
        },
        {
          provide: InternalNotificationsService,
          useValue: internalNotificationsService,
        },
      ],
    }).compile();

    service = module.get(SchedulingsService);
  });

  it('deve retornar false se nao houver disponibilidade para o horario', async () => {
    availabilityRepo.find.mockResolvedValue([]);

    const isAvailable = await service.checkProfessionalAvailability(
      'professional-1',
      new Date(2026, 4, 20, 10, 0, 0),
      new Date(2026, 4, 20, 11, 0, 0),
    );

    expect(isAvailable).toBe(false);
  });

  it('deve retornar true se houver disponibilidade e capacidade livre', async () => {
    availabilityRepo.find.mockResolvedValue([
      {
        dayOfWeek: 'WED',
        startTime: '08:00',
        endTime: '18:00',
        maxConcurrentClients: 2,
      },
    ]);
    schedulingRepo.createQueryBuilder.mockReturnValue(createCountQueryBuilder(1));

    const isAvailable = await service.checkProfessionalAvailability(
      'professional-1',
      new Date(2026, 4, 20, 10, 0, 0),
      new Date(2026, 4, 20, 11, 0, 0),
    );

    expect(isAvailable).toBe(true);
  });

  it('deve retornar false se capacidade simultanea estiver no limite', async () => {
    availabilityRepo.find.mockResolvedValue([
      {
        dayOfWeek: 'WED',
        startTime: '08:00',
        endTime: '18:00',
        maxConcurrentClients: 1,
      },
    ]);
    schedulingRepo.createQueryBuilder.mockReturnValue(createCountQueryBuilder(1));

    const isAvailable = await service.checkProfessionalAvailability(
      'professional-1',
      new Date('2026-05-20T10:00:00.000Z'),
      new Date('2026-05-20T11:00:00.000Z'),
    );

    expect(isAvailable).toBe(false);
  });

  it('deve bloquear agendamento quando cliente ficou sem credito e mensalidade nao esta em dia', async () => {
    const { start: futureStart, end: futureEnd } = createFutureBusinessSlot();
    const dayOfWeek = dayOfWeekFromDate(futureStart);
    const client = {
      id: 'client-1',
      creditsRemaining: 0,
      plan: 'MONTHLY',
      user: { id: 'user-client', email: 'client@mail.com' },
    } as unknown as Client;

    clientRepo.findOne.mockResolvedValue(client);
    professionalRepo.findOne.mockResolvedValue({
      id: 'professional-1',
      user: { name: 'Profissional' },
    } as Professional);
    userRepo.findOne.mockResolvedValue({ id: 'admin-1' } as User);

    availabilityRepo.find.mockResolvedValue([
      {
        dayOfWeek,
        startTime: '08:00',
        endTime: '18:00',
        maxConcurrentClients: 2,
      },
    ]);
    schedulingRepo.createQueryBuilder
      .mockReturnValueOnce(createCountQueryBuilder(0))
      .mockReturnValueOnce(createConflictQueryBuilder(null));
    subscriptionBillingService.getClientSubscriptionSnapshot.mockResolvedValue({
      status: 'PENDING',
      isUpToDate: false,
      cycle: 'MONTHLY',
      billing: null,
    });

    await expect(
      service.create(
        {
          clientId: 'client-1',
          professionalId: 'professional-1',
          startAt: futureStart.toISOString(),
          endAt: futureEnd.toISOString(),
        },
        { sub: 'admin-1', email: 'admin@mail.com', role: UserRole.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(schedulingRepo.save).not.toHaveBeenCalled();
    expect(clientRepo.save).not.toHaveBeenCalled();
  });

  it('deve debitar credito quando agendamento for criado com sucesso', async () => {
    const { start: futureStart, end: futureEnd } = createFutureBusinessSlot();
    const dayOfWeek = dayOfWeekFromDate(futureStart);
    const client = {
      id: 'client-1',
      creditsRemaining: 4,
      plan: 'MONTHLY',
      user: { id: 'user-client', email: 'client@mail.com' },
    } as unknown as Client;
    const professional = {
      id: 'professional-1',
      user: { name: 'Profissional' },
    } as Professional;

    clientRepo.findOne.mockResolvedValue(client);
    professionalRepo.findOne.mockResolvedValue(professional);
    userRepo.findOne.mockResolvedValue({ id: 'admin-1' } as User);
    availabilityRepo.find.mockResolvedValue([
      {
        dayOfWeek,
        startTime: '08:00',
        endTime: '18:00',
        maxConcurrentClients: 2,
      },
    ]);
    schedulingRepo.createQueryBuilder
      .mockReturnValueOnce(createCountQueryBuilder(0))
      .mockReturnValueOnce(createConflictQueryBuilder(null));
    subscriptionBillingService.getClientSubscriptionSnapshot.mockResolvedValue({
      status: 'PAID',
      isUpToDate: true,
      cycle: 'MONTHLY',
      billing: null,
    });
    schedulingRepo.create.mockImplementation((payload) => payload);
    schedulingRepo.save.mockImplementation(async (payload) => ({ id: 'sched-1', ...payload }));

    const created = await service.create(
      {
        clientId: 'client-1',
        professionalId: 'professional-1',
        startAt: futureStart.toISOString(),
        endAt: futureEnd.toISOString(),
      },
      { sub: 'admin-1', email: 'admin@mail.com', role: UserRole.ADMIN },
    );

    expect(created.id).toBe('sched-1');
    expect(clientRepo.save).toHaveBeenCalledTimes(1);
    expect(client.creditsRemaining).toBe(3);
    expect(schedulingEventsPublisher.publishCreated).toHaveBeenCalledTimes(1);
    expect(internalNotificationsService.notifyReceptionAboutClientScheduling).not.toHaveBeenCalled();
  });

  it('deve notificar recepcao quando cliente cria agendamento', async () => {
    const { start: futureStart, end: futureEnd } = createFutureBusinessSlot();
    const dayOfWeek = dayOfWeekFromDate(futureStart);
    const client = {
      id: 'client-1',
      creditsRemaining: 4,
      plan: 'MONTHLY',
      user: { id: 'user-client', email: 'client@mail.com' },
    } as unknown as Client;
    const professional = {
      id: 'professional-1',
      user: { name: 'Profissional' },
    } as Professional;

    clientRepo.findOne
      .mockResolvedValueOnce(client)
      .mockResolvedValueOnce(client);
    professionalRepo.findOne.mockResolvedValue(professional);
    userRepo.findOne.mockResolvedValue({ id: 'user-client' } as User);
    availabilityRepo.find.mockResolvedValue([
      {
        dayOfWeek,
        startTime: '08:00',
        endTime: '18:00',
        maxConcurrentClients: 2,
      },
    ]);
    schedulingRepo.createQueryBuilder
      .mockReturnValueOnce(createCountQueryBuilder(0))
      .mockReturnValueOnce(createConflictQueryBuilder(null));
    subscriptionBillingService.getClientSubscriptionSnapshot.mockResolvedValue({
      status: 'PAID',
      isUpToDate: true,
      cycle: 'MONTHLY',
      billing: null,
    });
    schedulingRepo.create.mockImplementation((payload) => payload);
    schedulingRepo.save.mockImplementation(async (payload) => ({ id: 'sched-2', ...payload }));

    await service.create(
      {
        clientId: 'client-1',
        professionalId: 'professional-1',
        startAt: futureStart.toISOString(),
        endAt: futureEnd.toISOString(),
      },
      { sub: 'user-client', email: 'client@mail.com', role: UserRole.CLIENT },
    );

    expect(internalNotificationsService.notifyReceptionAboutClientScheduling).toHaveBeenCalledTimes(1);
  });

  it('cliente autenticado nao pode agendar em nome de outro cliente', async () => {
    clientRepo.findOne.mockResolvedValue({
      id: 'client-own',
      user: { id: 'user-client' },
    } as unknown as Client);

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    await expect(
      service.create(
        {
          clientId: 'client-other',
          professionalId: 'professional-1',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        },
        { sub: 'user-client', email: 'client@mail.com', role: UserRole.CLIENT },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve estornar credito quando cancelamento nao for no-show', async () => {
    const scheduling = {
      id: 'sched-1',
      status: 'SCHEDULED',
      client: {
        id: 'client-1',
        creditsRemaining: 2,
        user: { id: 'user-client', email: 'client@mail.com' },
      },
      startAt: new Date(),
    } as unknown as Scheduling;

    schedulingRepo.findOne.mockResolvedValue(scheduling);
    schedulingRepo.save.mockImplementation(async (payload) => payload);

    await service.cancel(
      'sched-1',
      { sub: 'admin-1', email: 'admin@mail.com', role: UserRole.ADMIN },
      CancellationType.CLIENT_CANCELLED,
      'Sem disponibilidade',
    );

    expect(clientRepo.save).toHaveBeenCalledTimes(1);
    expect(scheduling.client.creditsRemaining).toBe(3);
    expect(schedulingEventsPublisher.publishCancelled).toHaveBeenCalledTimes(1);
  });

  it('deve confirmar presenca e publicar evento de check-in', async () => {
    const scheduling = {
      id: 'sched-2',
      status: 'SCHEDULED',
      client: { user: { name: 'Cliente Teste' } },
      professional: { user: { name: 'Profissional Teste', phone: '+5511988887777' } },
      startAt: new Date(),
    } as unknown as Scheduling;

    schedulingRepo.findOne.mockResolvedValue(scheduling);
    schedulingRepo.save.mockImplementation(async (payload) => payload);
    userRepo.findOne.mockResolvedValue({
      id: 'admin-1',
      name: 'Recepcao',
      phone: '+5511977776666',
    } as User);

    const updated = await service.checkIn('sched-2', {
      sub: 'admin-1',
      email: 'admin@mail.com',
      role: UserRole.ADMIN,
    });

    expect(updated.status).toBe('CHECKED_IN');
    expect(schedulingEventsPublisher.publishCheckedIn).toHaveBeenCalledTimes(1);
    expect(schedulingEventsPublisher.publishCheckedIn).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalPhone: '+5511988887777',
        receptionPhone: '+5511977776666',
      }),
    );
  });
});
