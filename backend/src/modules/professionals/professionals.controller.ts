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
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SchedulingsService } from '../schedulings/schedulings.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { ListProfessionalsQueryDto } from './dto/list-professionals-query.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalsController {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly schedulingsService: SchedulingsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  create(@Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  findAll(@Query() query: ListProfessionalsQueryDto) {
    return this.professionalsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionalsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.remove(id);
  }

  @Post(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  replaceAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ParseArrayPipe({ items: UpsertAvailabilityDto }))
    dto: UpsertAvailabilityDto[],
  ) {
    return this.professionalsService.replaceAvailability(id, dto);
  }

  @Get(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  findAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findAvailability(id);
  }

  @Get(':id/slots')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  findSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    return this.schedulingsService.getAvailableSlots(id, new Date(date), Number(duration || 60));
  }
}
