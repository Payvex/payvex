import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
// Importe o Enum direto do Prisma Client (ele é gerado automaticamente)
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail({}, { message: 'Por favor, forneça um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail não pode estar vazio.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome não pode estar vazio.' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  password: string; // O cliente envia a senha, o backend faz o hash

  @IsEnum(Role, { message: 'O "role" deve ser ADMIN ou USER' })
  @IsNotEmpty({ message: 'A "role" (função) do usuário é obrigatória.' })
  role: Role; // O admin define se o novo usuário é 'ADMIN' ou 'USER'

  @IsOptional()
  @IsString()
  filialId?: string;
}
