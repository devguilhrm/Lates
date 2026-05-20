import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Client, Professional, User } from '../../database/entities';
import { SeedsService } from './seeds.service';

type RepoMock<T> = {
  findOne: jest.Mock;
  recover: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

describe('SeedsService', () => {
  let service: SeedsService;
  let usersRepo: RepoMock<User>;
  let clientsRepo: RepoMock<Client>;
  let professionalsRepo: RepoMock<Professional>;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      recover: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: entity.id ?? `id-${Math.random()}`, ...entity })),
    };
    clientsRepo = {
      findOne: jest.fn(),
      recover: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: entity.id ?? `id-${Math.random()}`, ...entity })),
    };
    professionalsRepo = {
      findOne: jest.fn(),
      recover: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (entity) => ({ id: entity.id ?? `id-${Math.random()}`, ...entity })),
    };
    config = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedsService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Client), useValue: clientsRepo },
        { provide: getRepositoryToken(Professional), useValue: professionalsRepo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(SeedsService);
  });

  it('deve criar clientes e profissionais demo mesmo sem ADMIN_EMAIL/ADMIN_PASSWORD', async () => {
    config.get.mockReturnValue(undefined);

    usersRepo.findOne.mockResolvedValue(null);
    clientsRepo.findOne.mockResolvedValue(null);
    professionalsRepo.findOne.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(clientsRepo.save).toHaveBeenCalledTimes(3);
    expect(professionalsRepo.save).toHaveBeenCalledTimes(2);
  });

  it('deve criar admin quando variaveis de ambiente estiverem configuradas', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'ADMIN_EMAIL') return 'admin@pilatesos.com';
      if (key === 'ADMIN_PASSWORD') return 'admin123';
      if (key === 'ADMIN_NAME') return 'Administrador';
      return undefined;
    });

    usersRepo.findOne.mockResolvedValue(null);
    clientsRepo.findOne.mockResolvedValue(null);
    professionalsRepo.findOne.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(usersRepo.save).toHaveBeenCalled();
  });
});
