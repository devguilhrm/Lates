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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
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

@ApiTags('Professionals')
@ApiBearerAuth()
@Controller('professionals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfessionalsController {
  constructor(
    private readonly professionalsService: ProfessionalsService,
    private readonly schedulingsService: SchedulingsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Criar profissional' })
  @ApiCreatedResponse({ description: 'Profissional criado com sucesso.' })
  create(@Body() dto: CreateProfessionalDto) {
    return this.professionalsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @ApiOperation({ summary: 'Listar profissionais' })
  @ApiOkResponse({ description: 'Lista paginada de profissionais.' })
  findAll(@Query() query: ListProfessionalsQueryDto) {
    return this.professionalsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @ApiOperation({ summary: 'Buscar profissional por ID' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiOkResponse({ description: 'Profissional encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Atualizar profissional' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiOkResponse({ description: 'Profissional atualizado.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfessionalDto) {
    return this.professionalsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativar/excluir profissional' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiNoContentResponse({ description: 'Profissional removido com sucesso.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.remove(id);
  }

  @Post(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Substituir disponibilidade semanal do profissional' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiCreatedResponse({ description: 'Disponibilidade atualizada.' })
  replaceAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ParseArrayPipe({ items: UpsertAvailabilityDto }))
    dto: UpsertAvailabilityDto[],
  ) {
    return this.professionalsService.replaceAvailability(id, dto);
  }

  @Get(':id/availability')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL)
  @ApiOperation({ summary: 'Consultar disponibilidade do profissional' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiOkResponse({ description: 'Disponibilidade encontrada.' })
  findAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.professionalsService.findAvailability(id);
  }

  @Get(':id/slots')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.PROFESSIONAL, UserRole.CLIENT)
  @ApiOperation({ summary: 'Listar horários disponíveis para agendamento' })
  @ApiParam({ name: 'id', description: 'UUID do profissional' })
  @ApiQuery({ name: 'date', required: true, example: '2026-05-20' })
  @ApiQuery({ name: 'duration', required: false, example: '60' })
  @ApiOkResponse({ description: 'Slots disponíveis retornados.' })
  findSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date: string,
    @Query('duration') duration: string,
  ) {
    return this.schedulingsService.getAvailableSlots(id, new Date(date), Number(duration || 60));
  }
}
