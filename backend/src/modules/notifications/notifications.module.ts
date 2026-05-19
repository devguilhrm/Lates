import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationsConsumer } from './notifications.consumer';

@Module({
  providers: [MailService, NotificationsConsumer],
  exports: [MailService],
})
export class NotificationsModule {}
