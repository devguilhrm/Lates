import { IsEnum, IsInt, IsString, Matches, Min } from 'class-validator';
import { DayOfWeek } from '../../../common/enums';

export class UpsertAvailabilityDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime!: string;

  @IsInt()
  @Min(1)
  maxConcurrentClients!: number;
}
