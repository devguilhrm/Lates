import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private producer?: Producer;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const brokers = this.getBrokers();
    if (!brokers.length) {
      this.logger.warn('Kafka desabilitado: KAFKA_BROKERS não configurado.');
      return;
    }

    const kafka = new Kafka({
      clientId: this.config.get<string>('KAFKA_CLIENT_ID') ?? 'pilatesos-api',
      brokers,
    });

    this.producer = kafka.producer();

    try {
      await this.producer.connect();
      this.logger.log('Kafka producer conectado.');
    } catch (error) {
      this.logger.warn(`Kafka producer indisponível: ${this.formatError(error)}`);
      this.producer = undefined;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }

  async emit<TPayload>(topic: string, key: string, payload: TPayload): Promise<void> {
    if (!this.producer) {
      this.logger.warn(`Evento Kafka ignorado sem conexão: ${topic}`);
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(payload) }],
      });
    } catch (error) {
      this.logger.warn(`Falha ao publicar Kafka ${topic}: ${this.formatError(error)}`);
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
