import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateServiceQuoteDto } from './dto/create-service-quote.dto';
import { ServicesService } from './services.service';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Listar catálogo de serviços e planos' })
  @ApiQuery({ name: 'search', required: false, description: 'Filtro por nome do serviço' })
  @ApiOkResponse({ description: 'Catálogo retornado com sucesso.' })
  listCatalog(@Query('search') search?: string): unknown {
    return this.servicesService.listCatalog(search);
  }

  @Post('quotes')
  @ApiOperation({ summary: 'Criar orçamento de serviços' })
  @ApiCreatedResponse({ description: 'Orçamento criado com sucesso.' })
  createQuote(@Body() dto: CreateServiceQuoteDto): unknown {
    return this.servicesService.createQuote(dto);
  }

  @Get('quotes/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiOperation({ summary: 'Gerar PDF do orçamento' })
  @ApiParam({ name: 'id', description: 'UUID do orçamento' })
  @ApiOkResponse({
    description: 'PDF gerado com sucesso.',
    schema: { type: 'string', format: 'binary' },
  })
  quotePdf(@Param('id') id: string): StreamableFile {
    const buffer = this.servicesService.getQuotePdf(id);
    return new StreamableFile(buffer, {
      disposition: `inline; filename="orcamento-${id}.pdf"`,
      type: 'application/pdf',
    });
  }
}
