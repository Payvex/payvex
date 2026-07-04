import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateApiKeyWebhookDto {
  @IsOptional()
  @IsString()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  webhookUrl?: string;
}
