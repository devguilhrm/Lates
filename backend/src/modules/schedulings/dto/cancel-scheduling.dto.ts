import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CancellationType } from '../../../common/enums';

export class CancelSchedulingDto {
  @IsEnum(CancellationType)
  type!: CancellationType;

  @IsOptional()
  @IsString()
  reason?: string;
}
