import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ListInternalNotificationsQueryDto } from './dto/list-internal-notifications-query.dto';
import { InternalNotificationsService } from './internal-notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
export class NotificationsController {
  constructor(private readonly internalNotificationsService: InternalNotificationsService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Listar inbox de notificacoes internas do usuario logado' })
  @ApiOkResponse({ description: 'Notificacoes carregadas com sucesso.' })
  listInbox(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListInternalNotificationsQueryDto,
  ) {
    return this.internalNotificationsService.listInbox(user, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificacao como lida' })
  @ApiParam({ name: 'id', description: 'UUID da notificacao' })
  @ApiOkResponse({ description: 'Notificacao atualizada.' })
  markAsRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.internalNotificationsService.markAsRead(id, user);
  }
}
