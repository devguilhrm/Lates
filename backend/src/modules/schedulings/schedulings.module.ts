import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability, Client, Professional, Scheduling, User } from '../../database/entities';
import { MessagingModule } from '../messaging/messaging.module';
import { SchedulingEventsPublisher } from './events/scheduling-events.publisher';
import { SchedulingsController } from './schedulings.controller';
import { SchedulingsService } from './schedulings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Scheduling, Client, Professional, Availability, User]), MessagingModule],
  controllers: [SchedulingsController],
  providers: [SchedulingsService, SchedulingEventsPublisher],
  exports: [SchedulingsService],
})
export class SchedulingsModule {}
