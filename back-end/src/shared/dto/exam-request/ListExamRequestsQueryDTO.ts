import { Transform } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { parseIntegerValue, toArrayValue } from '../transforms';

export class ListExamRequestsQueryDTO {
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(toArrayValue)
  examIds?: string[];

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
