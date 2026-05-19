import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Availability, Client, Professional, Scheduling } from '../../database/entities';
import { SchedulingsController } from './schedulings.controller';
import { SchedulingsService } from './schedulings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Scheduling, Client, Professional, Availability])],
  controllers: [SchedulingsController],
  providers: [SchedulingsService],
  exports: [SchedulingsService],
})
export class SchedulingsModule {}
