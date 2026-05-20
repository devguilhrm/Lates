import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateFinanceTransactionDto } from './dto/create-finance-transaction.dto';
import { FinanceDashboardQueryDto } from './dto/finance-dashboard-query.dto';
import { ListFinanceTransactionsQueryDto } from './dto/list-finance-transactions-query.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { RegisterSubscriptionPaymentDto } from './dto/register-subscription-payment.dto';
import { FinanceService } from './finance.service';

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Registrar transação financeira' })
  @ApiCreatedResponse({ description: 'Transação criada com sucesso.' })
  create(@Body() dto: CreateFinanceTransactionDto) {
    return this.financeService.createTransaction(dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Listar transações financeiras' })
  @ApiOkResponse({ description: 'Lista paginada de transações.' })
  list(@Query() query: ListFinanceTransactionsQueryDto) {
    return this.financeService.listTransactions(query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Consultar dashboard financeiro e de agenda' })
  @ApiOkResponse({ description: 'Indicadores agregados do período.' })
  dashboard(@Query() query: FinanceDashboardQueryDto) {
    return this.financeService.getDashboard(query);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar status de mensalidades/planos recorrentes' })
  @ApiOkResponse({ description: 'Lista paginada de assinaturas e status.' })
  listSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.financeService.listSubscriptions(query);
  }

  @Post('subscriptions/:clientId/pay')
  @ApiOperation({ summary: 'Registrar pagamento de mensalidade/plano do cliente' })
  @ApiParam({ name: 'clientId', description: 'UUID do cliente' })
  @ApiCreatedResponse({ description: 'Pagamento registrado e status atualizado.' })
  registerSubscriptionPayment(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: RegisterSubscriptionPaymentDto,
  ) {
    return this.financeService.registerSubscriptionPayment(clientId, dto);
  }
}
