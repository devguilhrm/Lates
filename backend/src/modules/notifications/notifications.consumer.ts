import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import {
  SCHEDULING_EVENTS_EXCHANGE,
  SchedulingEventRoutingKey,
  SchedulingKafkaTopic,
} from '../schedulings/events/scheduling-events';
import type {
  SchedulingCancelledEvent,
  SchedulingCreatedEvent,
  SchedulingReminderEvent,
} from '../schedulings/events/scheduling-events';
import { MailService } from './mail.service';

@Injectable()
export class NotificationsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsConsumer.name);
  private consumer?: Consumer;

  constructor(
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.getBrokers();
    if (!brokers.length) {
      this.logger.warn('Kafka consumer desabilitado: KAFKA_BROKERS não configurado.');
      return;
    }

    const kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') ?? 'pilatesos-api',
      brokers,
    });

    this.consumer = kafka.consumer({
      groupId: this.config.get<string>('KAFKA_NOTIFICATIONS_GROUP_ID') ?? 'pilatesos-notifications',
    });

    try {
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: SchedulingKafkaTopic.Created, fromBeginning: false });
      await this.consumer.subscribe({ topic: SchedulingKafkaTopic.Cancelled, fromBeginning: false });
      await this.consumer.subscribe({ topic: SchedulingKafkaTopic.Reminder, fromBeginning: false });
      await this.consumer.run({ eachMessage: (message) => this.handleKafkaMessage(message) });
      this.logger.log('Kafka notification consumer conectado.');
    } catch (error) {
      this.logger.warn(`Kafka notification consumer indisponível: ${this.formatError(error)}`);
      await this.consumer?.disconnect();
      this.consumer = undefined;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  @RabbitSubscribe({
    exchange: SCHEDULING_EVENTS_EXCHANGE,
    routingKey: SchedulingEventRoutingKey.Created,
    queue: 'notifications.scheduling.created',
  })
  async onSchedulingCreated(payload: SchedulingCreatedEvent): Promise<void> {
    await this.mailService.sendConfirmation(payload);
  }

  @RabbitSubscribe({
    exchange: SCHEDULING_EVENTS_EXCHANGE,
    routingKey: SchedulingEventRoutingKey.Cancelled,
    queue: 'notifications.scheduling.cancelled',
  })
  async onSchedulingCancelled(payload: SchedulingCancelledEvent): Promise<void> {
    await this.mailService.sendCancellation(payload);
  }

  @RabbitSubscribe({
    exchange: SCHEDULING_EVENTS_EXCHANGE,
    routingKey: SchedulingEventRoutingKey.Reminder,
    queue: 'notifications.scheduling.reminder',
  })
  async onSchedulingReminder(payload: SchedulingReminderEvent): Promise<void> {
    await this.mailService.sendReminder(payload);
  }

  private async handleKafkaMessage({ topic, message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    const payload = JSON.parse(message.value.toString()) as unknown;

    if (topic === SchedulingKafkaTopic.Created) {
      await this.onSchedulingCreated(payload as SchedulingCreatedEvent);
      return;
    }

    if (topic === SchedulingKafkaTopic.Cancelled) {
      await this.onSchedulingCancelled(payload as SchedulingCancelledEvent);
      return;
    }

    if (topic === SchedulingKafkaTopic.Reminder) {
      await this.onSchedulingReminder(payload as SchedulingReminderEvent);
    }
  }

  private getBrokers(): string[] {
    const brokers = this.config.get<string>('KAFKA_BROKERS') ?? '';
    return brokers
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
