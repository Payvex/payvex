/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateFilialDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome da filial é obrigatório.' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
  @Length(14, 14, { message: 'O CNPJ deve ter exatamente 14 dígitos.' })
  cnpj: string;

  // Novos campos de endereço
  @IsString()
  @IsOptional()
  @Length(8, 9, { message: 'O CEP deve ter entre 8 e 9 caracteres.' })
  cep?: string;

  @IsString()
  @IsOptional()
  logradouro?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'A UF deve ter exatamente 2 caracteres (Ex: SP).' })
  uf?: string;
}
