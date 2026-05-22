import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerService } from '../../messaging/kafka-producer.service';
import {
  SchedulingCheckedInEvent,
  SCHEDULING_EVENTS_EXCHANGE,
  SchedulingCancelledEvent,
  SchedulingCreatedEvent,
  SchedulingEventRoutingKey,
  SchedulingKafkaTopic,
  SchedulingReminderEvent,
} from './scheduling-events';

@Injectable()
export class SchedulingEventsPublisher {
  private readonly logger = new Logger(SchedulingEventsPublisher.name);

  constructor(
    @Optional()
    private readonly amqpConnection: AmqpConnection | undefined,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly config: ConfigService,
  ) {}

  async publishCreated(payload: SchedulingCreatedEvent): Promise<void> {
    await this.publish(
      SchedulingEventRoutingKey.Created,
      SchedulingKafkaTopic.Created,
      payload.schedulingId,
      payload,
    );
  }

  async publishCancelled(payload: SchedulingCancelledEvent): Promise<void> {
    await this.publish(
      SchedulingEventRoutingKey.Cancelled,
      SchedulingKafkaTopic.Cancelled,
      payload.schedulingId,
      payload,
    );
  }

  async publishReminder(payload: SchedulingReminderEvent): Promise<void> {
    await this.publish(
      SchedulingEventRoutingKey.Reminder,
      SchedulingKafkaTopic.Reminder,
      payload.schedulingId,
      payload,
    );
  }

  async publishCheckedIn(payload: SchedulingCheckedInEvent): Promise<void> {
    await this.publish(
      SchedulingEventRoutingKey.CheckedIn,
      SchedulingKafkaTopic.CheckedIn,
      payload.schedulingId,
      payload,
    );
  }

  private async publish<TPayload>(
    rabbitRoutingKey: string,
    kafkaTopic: string,
    key: string,
    payload: TPayload,
  ): Promise<void> {
    if (this.config.get<string>('QUEUES_ENABLED') === 'false') {
      this.logger.log(`Filas desabilitadas; evento ignorado: ${rabbitRoutingKey}`);
      return;
    }

    const [rabbitResult] = await Promise.allSettled([
      this.amqpConnection
        ? this.amqpConnection.publish(SCHEDULING_EVENTS_EXCHANGE, rabbitRoutingKey, payload)
        : Promise.resolve(),
      this.kafkaProducer.emit(kafkaTopic, key, payload),
    ]);

    if (rabbitResult.status === 'rejected') {
      this.logger.warn(
        `Falha ao publicar RabbitMQ ${rabbitRoutingKey}: ${this.formatError(rabbitResult.reason)}`,
      );
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
