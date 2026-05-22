import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalNotification, Scheduling, User } from '../../database/entities';
import { UserRole } from '../../common/enums';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListInternalNotificationsQueryDto } from './dto/list-internal-notifications-query.dto';

@Injectable()
export class InternalNotificationsService {
  constructor(
    @InjectRepository(InternalNotification)
    private readonly notificationRepo: Repository<InternalNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async notifyReceptionAboutClientScheduling(scheduling: Scheduling): Promise<void> {
    const recipients = await this.userRepo.find({
      where: [{ role: UserRole.ADMIN, isActive: true }, { role: UserRole.RECEPTIONIST, isActive: true }],
    });

    if (!recipients.length) return;

    const startAt = new Date(scheduling.startAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const title = 'Cliente confirmou agendamento';
    const message = `${scheduling.client.user.name} confirmou para ${startAt} com ${scheduling.professional.user.name}.`;

    await this.notificationRepo.save(
      recipients.map((user) =>
        this.notificationRepo.create({
          user,
          scheduling,
          type: 'SCHEDULING_CLIENT_CONFIRMED',
          title,
          message,
          isRead: false,
        }),
      ),
    );
  }

  async listInbox(actor: JwtPayload, query: ListInternalNotificationsQueryDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.scheduling', 'scheduling')
      .where('n.userId = :userId', { userId: actor.sub })
      .orderBy('n.createdAt', 'DESC')
      .take(limit);

    if (query.unreadOnly) {
      qb.andWhere('n.isRead = false');
    }

    const [items, unreadCount] = await Promise.all([
      qb.getMany(),
      this.notificationRepo.count({
        where: {
          user: { id: actor.sub },
          isRead: false,
        },
      }),
    ]);

    return {
      unreadCount,
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        message: item.message,
        isRead: item.isRead,
        createdAt: item.createdAt,
        readAt: item.readAt ?? null,
        schedulingId: item.scheduling?.id ?? null,
      })),
    };
  }

  async markAsRead(id: string, actor: JwtPayload) {
    const item = await this.notificationRepo.findOne({
      where: { id, user: { id: actor.sub } },
      relations: { user: true, scheduling: true },
    });
    if (!item) throw new NotFoundException('Notificacao nao encontrada.');

    if (!item.isRead) {
      item.isRead = true;
      item.readAt = new Date();
      await this.notificationRepo.save(item);
    }

    return {
      id: item.id,
      isRead: item.isRead,
      readAt: item.readAt ?? null,
    };
  }
}
