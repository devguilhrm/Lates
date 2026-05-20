import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentChannel, PaymentMethod } from '../../../common/enums';

export class GenerateSubscriptionPaymentCodeDto {
  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.PIX })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentChannel, default: PaymentChannel.APP_QR })
  @IsOptional()
  @IsEnum(PaymentChannel)
  paymentChannel?: PaymentChannel;
}
