import { IsNotEmpty, IsUUID } from 'class-validator';

export class AuthOrganizationParamsDTO {
  @IsNotEmpty()
  @IsUUID('4')
  readonly organizationId!: string;
}
