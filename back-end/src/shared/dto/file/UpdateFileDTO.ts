import { IsOptional, IsUUID } from 'class-validator';

export class UpdateFileDTO {
  @IsOptional()
  @IsUUID()
  folderId?: string;
}

export class UpdateFileParamsDTO {
  @IsUUID()
  id!: string;
}
