import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFilialDto {
  @IsString()
  @IsOptional()
  name?: string; // Ex: "Matriz" ou "Unidade 01"

  @IsString()
  @IsNotEmpty({ message: 'O CNPJ é obrigatório' })
  cnpj: string;
}
