import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CancellationType } from '../../../common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelSchedulingDto {
  @ApiProperty({ enum: CancellationType, example: CancellationType.CLIENT_CANCELLED })
  @IsEnum(CancellationType)
  type!: CancellationType;

  @ApiPropertyOptional({ example: 'Cliente informou conflito de horário.' })
  @IsOptional()
  @IsString()
  reason?: string;
}
