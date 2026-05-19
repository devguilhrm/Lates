import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SchedulingsService } from './schedulings.service';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';
import { CancelSchedulingDto } from './dto/cancel-scheduling.dto';

@Controller('schedulings')
export class SchedulingsController {
  constructor(private readonly schedulingsService: SchedulingsService) {}

  @Post()
  create(@Body() dto: CreateSchedulingDto) {
    return this.schedulingsService.create(dto);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSchedulingDto) {
    return this.schedulingsService.cancel(id, dto.reason);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.schedulingsService.complete(id);
  }

  @Get('professionals/:professionalId/slots')
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
