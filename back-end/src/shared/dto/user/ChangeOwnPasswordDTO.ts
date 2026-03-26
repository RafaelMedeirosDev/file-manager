import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeOwnPasswordDTO {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(255)
  confirmNewPassword!: string;
}
