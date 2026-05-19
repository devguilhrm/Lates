import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async check() {
    await this.dataSource.query('SELECT 1');

    return {
      status: 'ok',
      database: 'ok',
      queues: this.config.get<string>('QUEUES_ENABLED') === 'false' ? 'disabled' : 'enabled',
      timestamp: new Date().toISOString(),
    };
  }
}
