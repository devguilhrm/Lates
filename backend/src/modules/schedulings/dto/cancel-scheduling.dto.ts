import { IsNotEmpty, IsString } from 'class-validator';

export class CancelSchedulingDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
