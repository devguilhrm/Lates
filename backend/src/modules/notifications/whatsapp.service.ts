import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SchedulingCheckedInEvent } from '../schedulings/events/scheduling-events';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly config: ConfigService) {}

  async sendProfessionalCheckInNotification(payload: SchedulingCheckedInEvent): Promise<void> {
    const endpoint = this.config.get<string>('WHATSAPP_API_URL');
    const token = this.config.get<string>('WHATSAPP_API_TOKEN');

    const message = this.buildCheckInMessage(payload);

    if (!endpoint) {
      this.logger.log(
        `Stub WhatsApp check-in -> ${payload.professionalPhone}: ${message.replace(/\s+/g, ' ').trim()}`,
      );
      return;
    }

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          from: payload.receptionPhone,
          to: payload.professionalPhone,
          type: 'text',
          text: message,
          metadata: {
            schedulingId: payload.schedulingId,
            event: 'scheduling.checked-in',
          },
        }),
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falha ao enviar WhatsApp de check-in: ${details}`);
    }
  }

  private buildCheckInMessage(payload: SchedulingCheckedInEvent): string {
    const classTime = new Date(payload.startAt).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return [
      `Check-in confirmado pela recepcao (${payload.checkedInByName}).`,
      `Cliente: ${payload.clientName}.`,
      `Profissional: ${payload.professionalName}.`,
      `Horario: ${classTime}.`,
    ].join(' ');
  }
}
