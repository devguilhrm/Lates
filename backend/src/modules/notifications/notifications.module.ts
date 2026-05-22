import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalNotification, User } from '../../database/entities';
import { MailService } from './mail.service';
import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsController } from './notifications.controller';
import { WhatsAppService } from './whatsapp.service';
import { InternalNotificationsService } from './internal-notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternalNotification, User])],
  controllers: [NotificationsController],
  providers: [MailService, WhatsAppService, NotificationsConsumer, InternalNotificationsService],
  exports: [MailService, WhatsAppService, InternalNotificationsService],
})
export class NotificationsModule {}
