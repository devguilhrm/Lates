import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SchedulingsService } from './schedulings.service';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';
import { CancelSchedulingDto } from './dto/cancel-scheduling.dto';
import { ListSchedulingsQueryDto } from './dto/list-schedulings-query.dto';
import { RescheduleSchedulingDto } from './dto/reschedule-scheduling.dto';

@ApiTags('Schedulings')
@ApiBearerAuth()
@Controller('schedulings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingsController {
  constructor(private readonly schedulingsService: SchedulingsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  @ApiOperation({ summary: 'Criar agendamento' })
  @ApiCreatedResponse({ description: 'Agendamento criado com sucesso.' })
  create(@Body() dto: CreateSchedulingDto, @CurrentUser() user: JwtPayload) {
    return this.schedulingsService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Listar agendamentos' })
  @ApiOkResponse({ description: 'Lista paginada de agendamentos.' })
  findAll(@Query() query: ListSchedulingsQueryDto) {
    return this.schedulingsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  @ApiOkResponse({ description: 'Agendamento encontrado.' })
  findOne(@Param('id') id: string) {
    return this.schedulingsService.findOne(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  @ApiOperation({ summary: 'Cancelar agendamento com motivo categorizado' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  @ApiOkResponse({ description: 'Agendamento cancelado.' })
  cancel(@Param('id') id: string, @Body() dto: CancelSchedulingDto) {
    return this.schedulingsService.cancel(id, dto.type, dto.reason);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Concluir agendamento' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  @ApiOkResponse({ description: 'Agendamento concluído.' })
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulingsService.complete(id);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Remarcar agendamento para novo horário' })
  @ApiParam({ name: 'id', description: 'UUID do agendamento' })
  @ApiOkResponse({ description: 'Agendamento remarcado.' })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleSchedulingDto,
  ) {
    return this.schedulingsService.reschedule(id, dto);
  }

  @Get('professionals/:professionalId/slots')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @ApiOperation({ summary: 'Buscar slots disponíveis de um profissional' })
  @ApiParam({ name: 'professionalId', description: 'UUID do profissional' })
  @ApiQuery({ name: 'date', required: true, example: '2026-05-20' })
  @ApiQuery({ name: 'duration', required: false, example: '60' })
  @ApiOkResponse({ description: 'Slots disponíveis retornados.' })
  slots(
    @Param('professionalId') professionalId: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    return this.schedulingsService.getAvailableSlots(
      professionalId,
      new Date(date),
      Number(duration || 60),
    );
  }
}
