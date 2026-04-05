import { IsUUID } from 'class-validator';

export class BulkUploadFilesDTO {
  @IsUUID()
  folderId!: string;
}
