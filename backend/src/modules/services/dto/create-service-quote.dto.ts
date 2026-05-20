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

export class CreateServiceQuoteItemDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  duration?: string;
}

export class CreateServiceQuoteDto {
  @IsString()
  @MinLength(2)
  clientName!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  quoteValidity?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  recommendedFrequency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateServiceQuoteItemDto)
  items!: CreateServiceQuoteItemDto[];
}
