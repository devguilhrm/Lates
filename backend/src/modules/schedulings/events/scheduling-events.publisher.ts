import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from '../../messaging/kafka-producer.service';
import {
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
    private readonly amqpConnection: AmqpConnection,
    private readonly kafkaProducer: KafkaProducerService,
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

  private async publish<TPayload>(
    rabbitRoutingKey: string,
    kafkaTopic: string,
    key: string,
    payload: TPayload,
  ): Promise<void> {
    const [rabbitResult] = await Promise.allSettled([
      this.amqpConnection.publish(SCHEDULING_EVENTS_EXCHANGE, rabbitRoutingKey, payload),
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
