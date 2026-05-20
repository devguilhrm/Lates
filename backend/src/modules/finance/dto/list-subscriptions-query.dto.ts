import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SubscriptionBillingStatus } from '../../../common/enums';

export class ListSubscriptionsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SubscriptionBillingStatus)
  status?: SubscriptionBillingStatus;
}
