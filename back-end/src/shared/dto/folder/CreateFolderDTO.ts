import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { trimValue } from '../transforms';

export class CreateFolderDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimValue)
  name!: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  folderId?: string;
}
