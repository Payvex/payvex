/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Ex: "Meu WordPress"

  @IsUUID()
  @IsNotEmpty()
  filialId: string; // A qual filial essa chave pertence
}
