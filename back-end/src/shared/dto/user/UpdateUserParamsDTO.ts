import { IsUUID } from 'class-validator';

export class UpdateUserParamsDTO {
  @IsUUID()
  id!: string;
}
