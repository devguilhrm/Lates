import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
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

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  create(@Body() dto: CreateFinanceTransactionDto) {
    return this.financeService.createTransaction(dto);
  }

  @Get('transactions')
  list(@Query() query: ListFinanceTransactionsQueryDto) {
    return this.financeService.listTransactions(query);
  }

  @Get('dashboard')
  dashboard(@Query() query: FinanceDashboardQueryDto) {
    return this.financeService.getDashboard(query);
  }

  @Get('subscriptions')
  listSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.financeService.listSubscriptions(query);
  }

  @Post('subscriptions/:clientId/pay')
  registerSubscriptionPayment(
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: RegisterSubscriptionPaymentDto,
  ) {
    return this.financeService.registerSubscriptionPayment(clientId, dto);
  }
}
