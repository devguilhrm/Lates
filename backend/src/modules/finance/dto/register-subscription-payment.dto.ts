import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CardBrand, PaymentMethod } from '../../../common/enums';

export class RegisterSubscriptionPaymentDto {
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ValidateIf((dto: RegisterSubscriptionPaymentDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @IsEnum(CardBrand)
  cardBrand?: CardBrand;

  @ValidateIf((dto: RegisterSubscriptionPaymentDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
