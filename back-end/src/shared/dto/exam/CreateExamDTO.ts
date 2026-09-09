import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ExamCategory } from '@prisma/client';
import { trimUpperCase, trimValue } from '../transforms';

export class CreateExamDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(trimValue)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimUpperCase)
  code!: string;

  @IsEnum(ExamCategory)
  category!: ExamCategory;
}
