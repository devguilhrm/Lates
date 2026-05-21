import { UserRole } from '../../common/enums';
import { SchedulingsController } from './schedulings.controller';
import { SchedulingsService } from './schedulings.service';

describe('SchedulingsController', () => {
  let controller: SchedulingsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    cancel: jest.Mock;
    complete: jest.Mock;
    reschedule: jest.Mock;
    getAvailableSlots: jest.Mock;
  };

  const user = { sub: 'user-1', email: 'cliente@latesos.com', role: UserRole.CLIENT };

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      cancel: jest.fn(),
      complete: jest.fn(),
      reschedule: jest.fn(),
      getAvailableSlots: jest.fn(),
    };
    controller = new SchedulingsController(service as unknown as SchedulingsService);
  });

  it('deve criar agendamento', async () => {
    const dto = {
      clientId: 'client-1',
      professionalId: 'prof-1',
      startAt: '2026-05-21T10:00:00.000Z',
      endAt: '2026-05-21T11:00:00.000Z',
    };
    service.create.mockResolvedValue({ id: 'sch-1' });

    await expect(controller.create(dto as any, user)).resolves.toEqual({ id: 'sch-1' });
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('deve listar agendamentos', async () => {
    const query = { page: 1, limit: 10 };
    service.findAll.mockResolvedValue({ items: [], meta: { page: 1, limit: 10, total: 0 } });

    await expect(controller.findAll(query as any, user)).resolves.toEqual({
      items: [],
      meta: { page: 1, limit: 10, total: 0 },
    });
    expect(service.findAll).toHaveBeenCalledWith(query, user);
  });

  it('deve buscar agendamento por id', async () => {
    service.findOne.mockResolvedValue({ id: 'sch-2' });

    await expect(controller.findOne('sch-2', user)).resolves.toEqual({ id: 'sch-2' });
    expect(service.findOne).toHaveBeenCalledWith('sch-2', user);
  });

  it('deve cancelar agendamento', async () => {
    service.cancel.mockResolvedValue({ id: 'sch-3', status: 'CANCELLED' });
    const dto = { type: 'CLIENT_CANCELLED', reason: 'Imprevisto' };

    await expect(controller.cancel('sch-3', user, dto as any)).resolves.toEqual({
      id: 'sch-3',
      status: 'CANCELLED',
    });
    expect(service.cancel).toHaveBeenCalledWith('sch-3', user, dto.type, dto.reason);
  });

  it('deve concluir agendamento', async () => {
    service.complete.mockResolvedValue({ id: 'sch-4', status: 'COMPLETED' });

    await expect(controller.complete('sch-4')).resolves.toEqual({
      id: 'sch-4',
      status: 'COMPLETED',
    });
    expect(service.complete).toHaveBeenCalledWith('sch-4');
  });

  it('deve remarcar agendamento', async () => {
    const dto = {
      startAt: '2026-05-22T09:00:00.000Z',
      endAt: '2026-05-22T10:00:00.000Z',
      reason: 'Troca de horario',
    };
    service.reschedule.mockResolvedValue({ id: 'sch-5' });

    await expect(controller.reschedule('sch-5', dto as any)).resolves.toEqual({ id: 'sch-5' });
    expect(service.reschedule).toHaveBeenCalledWith('sch-5', dto);
  });

  it('deve retornar slots disponiveis', async () => {
    service.getAvailableSlots.mockResolvedValue([{ startAt: '2026-05-22T09:00:00.000Z' }]);

    await expect(controller.slots('prof-10', '2026-05-22', '60')).resolves.toEqual([
      { startAt: '2026-05-22T09:00:00.000Z' },
    ]);
    expect(service.getAvailableSlots).toHaveBeenCalledWith('prof-10', new Date('2026-05-22'), 60);
  });
});
