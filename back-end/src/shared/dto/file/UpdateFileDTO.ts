import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateFileDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  url?: string;
}

export class UpdateFileParamsDTO {
  @IsUUID()
  id!: string;
}
