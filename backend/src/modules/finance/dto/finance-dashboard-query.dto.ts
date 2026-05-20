import { IsDateString, IsOptional } from 'class-validator';

export class FinanceDashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
