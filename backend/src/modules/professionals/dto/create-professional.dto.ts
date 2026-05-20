import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Paula Nunes' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'prof.paula@latesos.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'prof123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: '(11) 98888-2001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ example: 'Pilates aparelhos, Reabilitacao postural' })
  @IsString()
  @MinLength(2)
  specialty!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;
}
