import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Availability, Client, Professional, Scheduling, User } from './database/entities';
import { SchedulingsModule } from './modules/schedulings/schedulings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC') === 'true',
        entities: [User, Client, Professional, Availability, Scheduling],
      }),
    }),
    RabbitMQModule.forRootAsync({ 
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [{ name: 'pilates.events', type: 'topic' }],
        uri: config.get<string>('RABBITMQ_URL'),
        connectionInitOptions: { wait: false },
      }),
    }),
    SchedulingsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
