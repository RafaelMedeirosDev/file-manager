import { IsUUID } from 'class-validator';

export class UpdateFolderParamsDTO {
  @IsUUID()
  id!: string;
}
