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

export class CreateFinanceTransactionDto {
  @IsString()
  @MaxLength(140)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsEnum(FinancialTransactionType)
  type!: FinancialTransactionType;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ValidateIf((dto: CreateFinanceTransactionDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @IsEnum(CardBrand)
  cardBrand?: CardBrand;

  @ValidateIf((dto: CreateFinanceTransactionDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
