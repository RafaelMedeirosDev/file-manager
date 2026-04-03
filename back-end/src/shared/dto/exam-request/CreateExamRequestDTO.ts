import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateExamRequestDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  indication!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  examIds!: string[];
}
