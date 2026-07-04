import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key-auth.guard';
import { UpdateApiKeyWebhookDto } from '../dtos/update-api-key-webhook.dto';
import { ApiKeyService } from '../services/apiKey.service';

@Controller('identity/plugin')
@UseGuards(ApiKeyAuthGuard)
export class PluginApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Get('me')
  async me(@Req() req: any) {
    return await this.apiKeyService.getPluginConfig(req.apiKey.key);
  }

  @Patch('webhook')
  async updateWebhook(@Req() req: any, @Body() dto: UpdateApiKeyWebhookDto) {
    return await this.apiKeyService.updateWebhookByKey(
      req.apiKey.key,
      dto.webhookUrl,
    );
  }
}
