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

export class CreateExamRequestDTO {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(trimValue)
  indication?: string;

  @IsOptional()
  @IsUUID('4')
  targetUserId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  examIds!: string[];
}
