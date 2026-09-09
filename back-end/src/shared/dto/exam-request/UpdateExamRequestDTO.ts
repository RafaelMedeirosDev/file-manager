import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { trimValue } from '../transforms';

export class UpdateExamRequestDTO {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimValue)
  readonly indication?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  readonly examIds?: string[];
}
