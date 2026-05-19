import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../database/entities';
import { SeedsService } from './seeds.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [SeedsService],
})
export class SeedsModule {}
