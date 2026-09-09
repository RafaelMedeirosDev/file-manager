import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { trimValue } from '../transforms';

export class UploadFileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimValue)
  name!: string;

  @IsUUID()
  folderId!: string;
}
