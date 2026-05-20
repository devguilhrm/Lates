import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Verificar saúde da API' })
  @ApiOkResponse({
    description: 'Status da aplicação e dependências.',
    schema: {
      example: {
        data: {
          status: 'ok',
          database: 'ok',
          queues: 'disabled',
          timestamp: '2026-05-20T00:00:00.000Z',
        },
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
