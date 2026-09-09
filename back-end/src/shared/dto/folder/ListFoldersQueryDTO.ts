import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { parseBooleanValue, parseIntegerValue } from '../transforms';

export class ListFoldersQueryDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @Transform(parseBooleanValue)
  @IsBoolean()
  rootsOnly?: boolean;

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
