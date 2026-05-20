import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class RescheduleSchedulingDto {
  @IsUUID()
  professionalId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
