import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ExamCategory } from '@prisma/client';
import { parseIntegerValue, trimValue } from '../transforms';

export class ListExamsQueryDTO {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimValue)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Transform(trimValue)
  code?: string;

  @IsOptional()
  @IsEnum(ExamCategory)
  category?: ExamCategory;

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
