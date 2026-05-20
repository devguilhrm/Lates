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
import { UserRole } from '../../common/enums';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateServiceQuoteDto } from './dto/create-service-quote.dto';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('catalog')
  listCatalog(@Query('search') search?: string): unknown {
    return this.servicesService.listCatalog(search);
  }

  @Post('quotes')
  createQuote(@Body() dto: CreateServiceQuoteDto): unknown {
    return this.servicesService.createQuote(dto);
  }

  @Get('quotes/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  quotePdf(@Param('id') id: string): StreamableFile {
    const buffer = this.servicesService.getQuotePdf(id);
    return new StreamableFile(buffer, {
      disposition: `inline; filename="orcamento-${id}.pdf"`,
      type: 'application/pdf',
    });
  }
}
