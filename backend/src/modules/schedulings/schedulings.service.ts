import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Availability, Client, Professional, Scheduling, User } from '../../database/entities';
import { CancellationType, DayOfWeek, SchedulingStatus, UserRole } from '../../common/enums';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';
import { ListSchedulingsQueryDto } from './dto/list-schedulings-query.dto';
import { RescheduleSchedulingDto } from './dto/reschedule-scheduling.dto';
import { TimeSlot } from './dto/time-slot.dto';
import { SchedulingEventsPublisher } from './events/scheduling-events.publisher';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SubscriptionBillingService } from '../billing/subscription-billing.service';
import { InternalNotificationsService } from '../notifications/internal-notifications.service';

@Injectable()
export class SchedulingsService {
  private readonly logger = new Logger(SchedulingsService.name);
  private readonly activeSchedulingStatuses = [
    SchedulingStatus.SCHEDULED,
    SchedulingStatus.CHECKED_IN,
  ];

  constructor(
    @InjectRepository(Scheduling)
    private readonly schedulingRepo: Repository<Scheduling>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Professional)
    private readonly professionalRepo: Repository<Professional>,
    @InjectRepository(Availability)
    private readonly availabilityRepo: Repository<Availability>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly schedulingEventsPublisher: SchedulingEventsPublisher,
    private readonly subscriptionBillingService: SubscriptionBillingService,
    private readonly internalNotificationsService: InternalNotificationsService,
  ) {}

  async checkProfessionalAvailability(
    professionalId: string,
    startAt: Date,
    endAt: Date,
    excludeSchedulingId?: string,
  ): Promise<boolean> {
    const availability = await this.getAvailabilityForSlot(professionalId, startAt, endAt);
    if (!availability) return false;

    const concurrentCount = await this.schedulingRepo
      .createQueryBuilder('s')
      .where('s.professionalId = :professionalId', { professionalId })
      .andWhere('s.status IN (:...activeStatuses)', {
        activeStatuses: this.activeSchedulingStatuses,
      })
      .andWhere('s.startAt < :endAt AND s.endAt > :startAt', { startAt, endAt })
      .andWhere(excludeSchedulingId ? 's.id != :excludeId' : '1=1', {
        excludeId: excludeSchedulingId,
      })
      .getCount();

    return concurrentCount < availability.maxConcurrentClients;
  }

  async checkClientConflict(
    clientId: string,
    startAt: Date,
    endAt: Date,
    excludeSchedulingId?: string,
  ): Promise<boolean> {
    const conflict = await this.schedulingRepo
      .createQueryBuilder('s')
      .where('s.clientId = :clientId', { clientId })
      .andWhere('s.status IN (:...activeStatuses)', {
        activeStatuses: this.activeSchedulingStatuses,
      })
      .andWhere('s.startAt < :endAt AND s.endAt > :startAt', { startAt, endAt })
      .andWhere(excludeSchedulingId ? 's.id != :excludeId' : '1=1', {
        excludeId: excludeSchedulingId,
      })
      .getOne();

    return !!conflict;
  }

  async create(dto: CreateSchedulingDto, actor: JwtPayload): Promise<Scheduling> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException('Horario final deve ser maior que o horario inicial.');
    }

    this.ensureFutureDate(startAt);

    const effectiveClientId = await this.resolveEffectiveClientId(dto.clientId, actor);

    const [client, professional, creator] = await Promise.all([
      this.clientRepo.findOne({ where: { id: effectiveClientId }, relations: { user: true } }),
      this.professionalRepo.findOne({ where: { id: dto.professionalId }, relations: { user: true } }),
      this.userRepo.findOne({ where: { id: actor.sub } }),
    ]);

    if (!client) throw new NotFoundException('Cliente nao encontrado.');
    if (!professional) throw new NotFoundException('Profissional nao encontrado.');

    const [professionalAvailable, clientConflict] = await Promise.all([
      this.checkProfessionalAvailability(dto.professionalId, startAt, endAt),
      this.checkClientConflict(effectiveClientId, startAt, endAt),
    ]);

    if (!professionalAvailable) {
      throw new BadRequestException('Profissional indisponivel no horario informado.');
    }
    if (clientConflict) {
      throw new BadRequestException('Cliente ja possui agendamento neste horario.');
    }
    await this.assertClientCanSchedule(client, startAt);

    const scheduling = this.schedulingRepo.create({
      client,
      professional,
      createdBy: creator ?? null,
      startAt,
      endAt,
      notes: dto.notes,
      status: SchedulingStatus.SCHEDULED,
    });

    client.creditsRemaining = client.creditsRemaining - 1;
    await this.clientRepo.save(client);
    const created = await this.schedulingRepo.save(scheduling);
    await this.schedulingEventsPublisher.publishCreated({
      schedulingId: created.id,
      clientEmail: client.user.email,
      professionalName: professional.user.name,
      startAt: created.startAt,
    });
    if (actor.role === UserRole.CLIENT) {
      await this.internalNotificationsService.notifyReceptionAboutClientScheduling(created);
    }

    this.logger.log(`Agendamento criado: ${created.id}`);
    return created;
  }

  async findAll(query: ListSchedulingsQueryDto, actor: JwtPayload) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 30, 100);
    let forcedClientId: string | null = null;
    if (actor.role === UserRole.CLIENT) {
      const ownClient = await this.clientRepo.findOne({
        where: { user: { id: actor.sub } },
        relations: { user: true },
      });
      if (!ownClient) {
        throw new NotFoundException('Perfil de cliente nao encontrado para o usuario autenticado.');
      }
      forcedClientId = ownClient.id;
    }

    const qb = this.schedulingRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.client', 'client')
      .leftJoinAndSelect('client.user', 'clientUser')
      .leftJoinAndSelect('s.professional', 'professional')
      .leftJoinAndSelect('professional.user', 'professionalUser')
      .leftJoinAndSelect('s.createdBy', 'createdBy')
      .orderBy('s.startAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    const effectiveClientId = forcedClientId ?? query.clientId;
    if (effectiveClientId) qb.andWhere('client.id = :clientId', { clientId: effectiveClientId });
    if (query.professionalId) {
      qb.andWhere('professional.id = :professionalId', { professionalId: query.professionalId });
    }
    if (query.startDate) qb.andWhere('s.startAt >= :startDate', { startDate: query.startDate });
    if (query.endDate) qb.andWhere('s.endAt <= :endDate', { endDate: query.endDate });
    if (query.search) {
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('clientUser.name ILIKE :search', { search: `%${query.search}%` })
            .orWhere('professionalUser.name ILIKE :search', { search: `%${query.search}%` })
            .orWhere('createdBy.name ILIKE :search', { search: `%${query.search}%` });
        }),
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, meta: { page, limit, total } };
  }

  async findOne(id: string, actor: JwtPayload): Promise<Scheduling> {
    const scheduling = await this.schedulingRepo.findOne({
      where: { id },
      relations: { client: { user: true }, professional: { user: true }, createdBy: true },
    });

    if (!scheduling) throw new NotFoundException('Agendamento nao encontrado.');
    await this.assertClientOwnership(scheduling, actor);
    return scheduling;
  }

  async cancel(id: string, actor: JwtPayload, type: CancellationType, reason?: string): Promise<Scheduling> {
    const scheduling = await this.schedulingRepo.findOne({
      where: { id },
      relations: { client: { user: true } },
    });

    if (!scheduling) throw new NotFoundException('Agendamento nao encontrado.');
    await this.assertClientOwnership(scheduling, actor);
    if (scheduling.status !== SchedulingStatus.SCHEDULED) {
      throw new BadRequestException('Apenas agendamentos com status SCHEDULED podem ser cancelados.');
    }

    scheduling.status = SchedulingStatus.CANCELLED;
    scheduling.cancellationType = type;
    scheduling.cancellationReason = reason ?? this.defaultCancellationReason(type);
    if (type !== CancellationType.NO_SHOW) {
      scheduling.client.creditsRemaining = scheduling.client.creditsRemaining + 1;
      await this.clientRepo.save(scheduling.client);
    }
    const updated = await this.schedulingRepo.save(scheduling);

    await this.schedulingEventsPublisher.publishCancelled({
      schedulingId: updated.id,
      clientEmail: updated.client.user.email,
      reason: updated.cancellationReason ?? this.defaultCancellationReason(type),
      startAt: updated.startAt,
    });

    return updated;
  }

  async complete(id: string): Promise<Scheduling> {
    const scheduling = await this.schedulingRepo.findOne({ where: { id } });
    if (!scheduling) throw new NotFoundException('Agendamento nao encontrado.');
    if (
      scheduling.status !== SchedulingStatus.SCHEDULED &&
      scheduling.status !== SchedulingStatus.CHECKED_IN
    ) {
      throw new BadRequestException(
        'Apenas agendamentos com status SCHEDULED ou CHECKED_IN podem ser concluidos.',
      );
    }

    scheduling.status = SchedulingStatus.COMPLETED;
    return this.schedulingRepo.save(scheduling);
  }

  async checkIn(id: string, actor: JwtPayload): Promise<Scheduling> {
    const scheduling = await this.schedulingRepo.findOne({
      where: { id },
      relations: { client: { user: true }, professional: { user: true } },
    });

    if (!scheduling) throw new NotFoundException('Agendamento nao encontrado.');
    if (scheduling.status !== SchedulingStatus.SCHEDULED) {
      throw new BadRequestException(
        'Apenas agendamentos com status SCHEDULED podem confirmar presenca.',
      );
    }

    const professionalPhone = scheduling.professional.user.phone?.trim();
    if (!professionalPhone) {
      throw new BadRequestException(
        'Profissional sem telefone cadastrado para notificacao de check-in via WhatsApp.',
      );
    }

    const actorUser = await this.userRepo.findOne({ where: { id: actor.sub } });
    const checkedInByName = actorUser?.name?.trim() || actor.email;
    const receptionPhone = actorUser?.phone?.trim();
    if (!receptionPhone) {
      throw new BadRequestException(
        'Usuario que confirmou o check-in nao possui telefone cadastrado para envio WhatsApp.',
      );
    }

    scheduling.status = SchedulingStatus.CHECKED_IN;
    const updated = await this.schedulingRepo.save(scheduling);

    await this.schedulingEventsPublisher.publishCheckedIn({
      schedulingId: updated.id,
      clientName: updated.client.user.name,
      professionalName: updated.professional.user.name,
      professionalPhone,
      checkedInByName,
      receptionPhone,
      startAt: updated.startAt,
    });

    return updated;
  }

  async reschedule(id: string, dto: RescheduleSchedulingDto): Promise<Scheduling> {
    const scheduling = await this.schedulingRepo.findOne({
      where: { id },
      relations: { client: { user: true }, professional: { user: true } },
    });

    if (!scheduling) throw new NotFoundException('Agendamento nao encontrado.');
    if (scheduling.status !== SchedulingStatus.SCHEDULED) {
      throw new BadRequestException('Apenas agendamentos com status SCHEDULED podem ser remarcados.');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('Horario final deve ser maior que o horario inicial.');
    }

    this.ensureFutureDate(startAt);

    const professional = await this.professionalRepo.findOne({
      where: { id: dto.professionalId },
      relations: { user: true },
    });
    if (!professional) throw new NotFoundException('Profissional nao encontrado.');

    const [professionalAvailable, clientConflict] = await Promise.all([
      this.checkProfessionalAvailability(dto.professionalId, startAt, endAt, scheduling.id),
      this.checkClientConflict(scheduling.client.id, startAt, endAt, scheduling.id),
    ]);

    if (!professionalAvailable) {
      throw new BadRequestException('Profissional indisponivel no horario informado.');
    }
    if (clientConflict) {
      throw new BadRequestException('Cliente ja possui agendamento neste horario.');
    }

    scheduling.professional = professional;
    scheduling.startAt = startAt;
    scheduling.endAt = endAt;
    scheduling.notes = dto.notes ?? scheduling.notes;
    return this.schedulingRepo.save(scheduling);
  }

  async getAvailableSlots(
    professionalId: string,
    date: Date,
    durationMinutes: number,
  ): Promise<TimeSlot[]> {
    if (durationMinutes <= 0) {
      throw new BadRequestException('Duracao invalida para busca de slots.');
    }

    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (normalizedDate < today) {
      throw new BadRequestException('Nao e permitido buscar slots em dias anteriores.');
    }

    const dayMap: DayOfWeek[] = [
      DayOfWeek.SUN,
      DayOfWeek.MON,
      DayOfWeek.TUE,
      DayOfWeek.WED,
      DayOfWeek.THU,
      DayOfWeek.FRI,
      DayOfWeek.SAT,
    ];
    const dayOfWeek = dayMap[date.getDay()];

    const availabilities = await this.availabilityRepo.find({
      where: { professional: { id: professionalId }, dayOfWeek },
      relations: { professional: true },
    });

    const slots: TimeSlot[] = [];
    for (const availability of availabilities) {
      const [startHour, startMinute] = availability.startTime.split(':').map(Number);
      const [endHour, endMinute] = availability.endTime.split(':').map(Number);

      const windowStart = new Date(date);
      windowStart.setHours(startHour, startMinute, 0, 0);

      const windowEnd = new Date(date);
      windowEnd.setHours(endHour, endMinute, 0, 0);

      for (
        let current = new Date(windowStart);
        current < windowEnd;
        current = new Date(current.getTime() + durationMinutes * 60000)
      ) {
        const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
        if (slotEnd > windowEnd) break;

        const isAvailable = await this.checkProfessionalAvailability(
          professionalId,
          current,
          slotEnd,
        );

        if (isAvailable) slots.push({ startAt: new Date(current), endAt: slotEnd });
      }
    }

    return slots;
  }

  private ensureFutureDate(startAt: Date): void {
    const now = new Date();
    if (startAt < now) {
      throw new BadRequestException('Nao e permitido agendar em data ou horario passados.');
    }
  }

  private async getAvailabilityForSlot(
    professionalId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<Availability | null> {
    const dayMap: DayOfWeek[] = [
      DayOfWeek.SUN,
      DayOfWeek.MON,
      DayOfWeek.TUE,
      DayOfWeek.WED,
      DayOfWeek.THU,
      DayOfWeek.FRI,
      DayOfWeek.SAT,
    ];

    const dayOfWeek = dayMap[startAt.getDay()];
    const availabilities = await this.availabilityRepo.find({
      where: { professional: { id: professionalId }, dayOfWeek },
    });

    const startTime = this.toTimeString(startAt);
    const endTime = this.toTimeString(endAt);

    return (
      availabilities.find(
        (availability) =>
          availability.startTime <= startTime && availability.endTime >= endTime,
      ) ?? null
    );
  }

  private toTimeString(value: Date): string {
    const hour = `${value.getHours()}`.padStart(2, '0');
    const minute = `${value.getMinutes()}`.padStart(2, '0');
    return `${hour}:${minute}`;
  }

  private defaultCancellationReason(type: CancellationType): string {
    if (type === CancellationType.PROFESSIONAL_CANCELLED) {
      return 'Profissional desmarcou.';
    }
    if (type === CancellationType.NO_SHOW) {
      return 'Cliente nao compareceu.';
    }
    return 'Cliente desmarcou.';
  }

  private async assertClientCanSchedule(client: Client, schedulingDate: Date): Promise<void> {
    const subscription = await this.subscriptionBillingService.getClientSubscriptionSnapshot(
      client,
      schedulingDate,
    );

    if (client.creditsRemaining <= 0) {
      if (subscription.status !== 'NOT_APPLICABLE' && subscription.status !== 'PAID') {
        throw new BadRequestException(
          'Impossivel agendar: mensalidade em aberto e creditos do ciclo anterior esgotados.',
        );
      }

      throw new BadRequestException('Cliente sem creditos disponiveis para agendar.');
    }
  }

  private async resolveEffectiveClientId(
    requestedClientId: string,
    actor: JwtPayload,
  ): Promise<string> {
    if (actor.role !== UserRole.CLIENT) return requestedClientId;

    const ownClient = await this.clientRepo.findOne({
      where: { user: { id: actor.sub } },
      relations: { user: true },
    });

    if (!ownClient) {
      throw new NotFoundException('Perfil de cliente nao encontrado para o usuario autenticado.');
    }
    if (requestedClientId !== ownClient.id) {
      throw new ForbiddenException('Cliente autenticado so pode agendar para si proprio.');
    }

    return ownClient.id;
  }

  private async assertClientOwnership(scheduling: Scheduling, actor: JwtPayload): Promise<void> {
    if (actor.role !== UserRole.CLIENT) return;

    const ownClient = await this.clientRepo.findOne({
      where: { user: { id: actor.sub } },
      relations: { user: true },
    });
    if (!ownClient) {
      throw new NotFoundException('Perfil de cliente nao encontrado para o usuario autenticado.');
    }
    if (scheduling.client.id !== ownClient.id) {
      throw new ForbiddenException('Cliente autenticado nao tem permissao para este agendamento.');
    }
  }
}
