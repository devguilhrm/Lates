import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PlanType } from '../../../common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Mariana Costa' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'cliente.mariana@latesos.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'cliente123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: '(11) 98765-1001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://site.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '1990-04-15' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'Dor lombar e rigidez cervical.' })
  @IsOptional()
  @IsString()
  anamnesis?: string;

  @ApiPropertyOptional({ example: 'Carlos Costa - (11) 97777-1001' })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ enum: PlanType, example: PlanType.MONTHLY })
  @IsEnum(PlanType)
  plan!: PlanType;

  @ApiPropertyOptional({ example: 12, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  creditsRemaining?: number;
}
