import { UserRole } from '../../common/enums';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    findSchedulings: jest.Mock;
  };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      findSchedulings: jest.fn(),
    };
    controller = new ClientsController(service as unknown as ClientsService);
  });

  it('deve criar cliente', async () => {
    const dto = {
      name: 'Maria',
      email: 'maria@latesos.com',
      password: 'senha123',
      plan: 'MONTHLY',
    };
    service.create.mockResolvedValue({ id: 'client-1' });

    await expect(controller.create(dto as any)).resolves.toEqual({ id: 'client-1' });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('deve listar clientes', async () => {
    service.findAll.mockResolvedValue({ items: [], meta: { page: 1, limit: 20, total: 0 } });
    const query = { page: 1, limit: 20 };

    await expect(controller.findAll(query as any)).resolves.toEqual({
      items: [],
      meta: { page: 1, limit: 20, total: 0 },
    });
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('deve buscar perfil do usuario autenticado', async () => {
    service.findByUserId.mockResolvedValue({ id: 'client-2' });
    const user = { sub: 'user-2', email: 'cliente@latesos.com', role: UserRole.CLIENT };

    await expect(controller.findMe(user)).resolves.toEqual({ id: 'client-2' });
    expect(service.findByUserId).toHaveBeenCalledWith('user-2');
  });

  it('deve buscar cliente por id', async () => {
    service.findOne.mockResolvedValue({ id: 'client-3' });

    await expect(controller.findOne('client-3')).resolves.toEqual({ id: 'client-3' });
    expect(service.findOne).toHaveBeenCalledWith('client-3');
  });

  it('deve atualizar cliente', async () => {
    service.update.mockResolvedValue({ id: 'client-4', user: { name: 'Atualizado' } });
    const dto = { name: 'Atualizado' };

    await expect(controller.update('client-4', dto as any)).resolves.toEqual({
      id: 'client-4',
      user: { name: 'Atualizado' },
    });
    expect(service.update).toHaveBeenCalledWith('client-4', dto);
  });

  it('deve remover cliente', async () => {
    service.remove.mockResolvedValue(undefined);

    await expect(controller.remove('client-5')).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith('client-5');
  });

  it('deve listar agendamentos do cliente', async () => {
    service.findSchedulings.mockResolvedValue([{ id: 'sch-1' }]);

    await expect(controller.findSchedulings('client-6')).resolves.toEqual([{ id: 'sch-1' }]);
    expect(service.findSchedulings).toHaveBeenCalledWith('client-6');
  });
});
