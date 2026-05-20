import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client, Professional, User } from '../../database/entities';
import { SeedsService } from './seeds.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Client, Professional])],
  providers: [SeedsService],
})
export class SeedsModule {}
