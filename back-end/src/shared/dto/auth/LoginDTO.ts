import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimLowerCase, trimValue } from '../transforms';

export class LoginDTO {
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
}
