import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { trimLowerCase, trimValue } from '../transforms';

export class CreateFileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimValue)
  name!: string;

  @IsUUID()
  userId!: string;

  @IsUUID()
  folderId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(trimLowerCase)
  extension!: string;

  // Chave do objeto dentro do bucket, nao uma URL: o download resolve o
  // binario por ela, entao nao ha endereco externo a validar.
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimValue)
  key!: string;
}
