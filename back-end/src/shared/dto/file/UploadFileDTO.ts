import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class UploadFileDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsUUID()
  folderId!: string;
}
