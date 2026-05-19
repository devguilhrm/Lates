import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendConfirmation(payload: unknown): Promise<void> {
    this.logger.log(`Stub e-mail confirmação: ${JSON.stringify(payload)}`);
  }

  async sendCancellation(payload: unknown): Promise<void> {
    this.logger.log(`Stub e-mail cancelamento: ${JSON.stringify(payload)}`);
  }

  async sendReminder(payload: unknown): Promise<void> {
    this.logger.log(`Stub e-mail lembrete: ${JSON.stringify(payload)}`);
  }
}
