import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SchedulingsService } from '../schedulings/schedulings.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { ListProfessionalsQueryDto } from './dto/list-professionals-query.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
export class ProfessionalsController {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly schedulingsService: SchedulingsService,
  ) {}

  @Post()
  create(@Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListProfessionalsQueryDto) {
    return this.professionalsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionalsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.remove(id);
  }

  @Post(':id/availability')
  replaceAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ParseArrayPipe({ items: UpsertAvailabilityDto }))
    dto: UpsertAvailabilityDto[],
  ) {
    return this.professionalsService.replaceAvailability(id, dto);
  }

  @Get(':id/availability')
  findAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findAvailability(id);
  }

  @Get(':id/slots')
  findSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    return this.schedulingsService.getAvailableSlots(id, new Date(date), Number(duration || 60));
  }
}
