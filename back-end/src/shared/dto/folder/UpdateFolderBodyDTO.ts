import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimValue } from '../transforms';

export class UpdateFolderBodyDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trimValue)
  name!: string;
}
