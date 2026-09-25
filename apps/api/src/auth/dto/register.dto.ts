import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Informe o nome.' })
  @Length(1, 100, { message: 'Nome deve ter entre 1 e 100 caracteres.' })
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString({ message: 'Informe o e-mail.' })
  @MaxLength(254, { message: 'E-mail deve ter no máximo 254 caracteres.' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @IsString({ message: 'Informe a senha.' })
  @Length(8, 128, { message: 'Senha deve ter entre 8 e 128 caracteres.' })
  password!: string;
}
