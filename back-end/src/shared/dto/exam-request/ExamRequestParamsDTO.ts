import { IsNotEmpty, IsUUID } from 'class-validator';

export class ExamRequestParamsDTO {
  @IsNotEmpty()
  @IsUUID('4')
  readonly id!: string;
}
