import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimLowerCase, trimValue } from '../transforms';

export class UpdateUserBodyDTO {
  @IsOptional()
  @IsEmail()
  @MaxLength(50)
  @Transform(trimLowerCase)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimValue)
  password?: string;
}
