import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { parseIntegerValue } from '../transforms';

export class ListFilesQueryDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @Transform(parseIntegerValue)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(parseIntegerValue)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
