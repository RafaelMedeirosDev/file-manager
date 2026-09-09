import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { parseIntegerValue, trimValue } from '../transforms';

export class ListUsersQueryDTO {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimValue)
  search?: string;

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
