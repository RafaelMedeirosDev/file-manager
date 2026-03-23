import { IsOptional, IsUUID } from 'class-validator';

export class ListFilesQueryDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;
}
