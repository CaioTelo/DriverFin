import { IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @Length(43, 43)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
