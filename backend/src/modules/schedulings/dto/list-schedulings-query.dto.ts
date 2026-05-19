import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { SchedulingStatus } from '../../../common/enums';

export class ListSchedulingsQueryDto {
  @IsOptional()
  @IsEnum(SchedulingStatus)
  status?: SchedulingStatus;

  @IsOptional()
  @IsUUID()
  professionalId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 30;
}
