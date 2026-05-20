import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RescheduleSchedulingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  professionalId!: string;

  @ApiProperty({ example: '2026-05-21T09:00:00.000Z' })
  @IsDateString()
  startAt!: string;

  @ApiProperty({ example: '2026-05-21T10:00:00.000Z' })
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
