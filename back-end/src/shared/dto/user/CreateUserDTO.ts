import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimArrayValues, trimLowerCase, trimValue } from '../transforms';

export class CreateUserDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimValue)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimLowerCase)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimValue)
  password!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayMaxSize(20)
  @Transform(trimArrayValues)
  folders?: string[];
}
