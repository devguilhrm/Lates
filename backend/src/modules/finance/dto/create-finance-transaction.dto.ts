import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CardBrand, FinancialTransactionType, PaymentMethod } from '../../../common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFinanceTransactionDto {
  @ApiProperty({ example: 'Mensalidade do aluno' })
  @IsString()
  @MaxLength(140)
  description!: string;

  @ApiProperty({ example: 320, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: FinancialTransactionType, example: FinancialTransactionType.INCOME })
  @IsEnum(FinancialTransactionType)
  type!: FinancialTransactionType;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ enum: CardBrand, example: CardBrand.VISA })
  @ValidateIf((dto: CreateFinanceTransactionDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @IsEnum(CardBrand)
  cardBrand?: CardBrand;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 24 })
  @ValidateIf((dto: CreateFinanceTransactionDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @ApiPropertyOptional({ example: 'Mensalidade' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ example: '2026-05-20T10:30:00.000Z' })
  @IsDateString()
  occurredAt!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({
    example: 10,
    minimum: 1,
    maximum: 500,
    description: 'Quantidade de creditos adicionados ao cliente para lancamentos de pacote de creditos.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  creditQuantity?: number;
}
