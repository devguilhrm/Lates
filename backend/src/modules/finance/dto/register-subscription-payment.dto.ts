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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterSubscriptionPaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ enum: CardBrand, example: CardBrand.VISA })
  @ValidateIf((dto: RegisterSubscriptionPaymentDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @IsEnum(CardBrand)
  cardBrand?: CardBrand;

  @ApiPropertyOptional({ example: 2, minimum: 1, maximum: 24 })
  @ValidateIf((dto: RegisterSubscriptionPaymentDto) => dto.paymentMethod === PaymentMethod.CREDIT_CARD)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  installments?: number;

  @ApiPropertyOptional({ example: 320, minimum: 0.01 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: '2026-05-20T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @ApiPropertyOptional({ example: 'Mensalidade - Mariana Costa' })
  @IsOptional()
  @IsString()
  description?: string;
}
