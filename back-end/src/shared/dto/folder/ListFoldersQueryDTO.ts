import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ListFoldersQueryDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return undefined;
    }

    return value === true || value === 'true';
  })
  @IsBoolean()
  rootsOnly?: boolean;
}
