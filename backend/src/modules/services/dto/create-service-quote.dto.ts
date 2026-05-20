import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceQuoteItemDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ example: 'Plano Mensal - Pilates Solo' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 320, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: '2x na semana' })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiPropertyOptional({ example: '1 mes' })
  @IsOptional()
  @IsString()
  duration?: string;
}

export class CreateServiceQuoteDto {
  @ApiProperty({ example: 'Mariana Costa' })
  @IsString()
  @MinLength(2)
  clientName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '(11) 98765-1001' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'cliente.mariana@latesos.com' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ example: '15 dias' })
  @IsOptional()
  @IsString()
  quoteValidity?: string;

  @ApiPropertyOptional({ example: 'Reabilitacao de coluna e fortalecimento.' })
  @IsOptional()
  @IsString()
  objective?: string;

  @ApiPropertyOptional({ example: '2 vezes por semana' })
  @IsOptional()
  @IsString()
  recommendedFrequency?: string;

  @ApiProperty({ type: [CreateServiceQuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceQuoteItemDto)
  items!: CreateServiceQuoteItemDto[];
}
