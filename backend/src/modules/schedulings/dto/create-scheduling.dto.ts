import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSchedulingDto {
  @IsUUID()
  clientId: string;

  @IsUUID()
  professionalId: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
