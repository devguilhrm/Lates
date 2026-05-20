import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

@Controller('schedulings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingsController {
  constructor(private readonly schedulingsService: SchedulingsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  create(@Body() dto: CreateSchedulingDto, @CurrentUser() user: JwtPayload) {
    return this.schedulingsService.create(dto, user.sub);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  findAll(@Query() query: ListSchedulingsQueryDto) {
    return this.schedulingsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  findOne(@Param('id') id: string) {
    return this.schedulingsService.findOne(id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  cancel(@Param('id') id: string, @Body() dto: CancelSchedulingDto) {
    return this.schedulingsService.cancel(id, dto.type, dto.reason);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  complete(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulingsService.complete(id);
  }

  @Patch(':id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleSchedulingDto,
  ) {
    return this.schedulingsService.reschedule(id, dto);
  }

  @Get('professionals/:professionalId/slots')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
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
