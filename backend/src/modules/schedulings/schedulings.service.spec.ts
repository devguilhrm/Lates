import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { Availability, Client, Professional, Scheduling, User } from '../../database/entities';
import { SchedulingEventsPublisher } from './events/scheduling-events.publisher';
import { SchedulingsService } from './schedulings.service';

function createCountQueryBuilder(count: number) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
  };
}

describe('SchedulingsService', () => {
  let service: SchedulingsService;
  let schedulingRepo: { createQueryBuilder: jest.Mock };
  let availabilityRepo: { find: jest.Mock };

  beforeEach(async () => {
    schedulingRepo = {
      createQueryBuilder: jest.fn(),
    };

    availabilityRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingsService,
        { provide: getRepositoryToken(Scheduling), useValue: schedulingRepo },
        { provide: getRepositoryToken(Client), useValue: {} },
        { provide: getRepositoryToken(Professional), useValue: {} },
        { provide: getRepositoryToken(Availability), useValue: availabilityRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        {
          provide: SchedulingEventsPublisher,
          useValue: {
            publishCreated: jest.fn(),
            publishCancelled: jest.fn(),
            publishReminder: jest.fn(),
          },
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
});
