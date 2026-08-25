import { IsNotEmpty, IsString } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string; // Ex: "Meu WordPress"

  @IsString()
  @IsNotEmpty()
  filialId: string; // A qual filial essa chave pertence
}
