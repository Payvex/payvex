/* eslint-disable prettier/prettier */
 
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateApiKeyDto } from '../dtos/create-api-key.dto';
import { UpdateApiKeyWebhookDto } from '../dtos/update-api-key-webhook.dto';
import { ApiKeyService } from '../services/apiKey.service';

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post('api-keys')
  async create(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem gerar chaves API.',
      );
    }

    return await this.apiKeyService.create(
      dto.name,
      dto.filialId,
      req.user.companyId,
    );
  }

  @Get('keys/:companyId')
  async findAll(@Req() req: any, @Param('companyId') companyId: string) {
    if (companyId !== req.user.companyId) {
      throw new ForbiddenException('Acesso negado às chaves desta empresa.');
    }

    return this.apiKeyService.findAll(req.user.companyId);
  }
  @Delete('keys/:id')
  async revoke(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Ação não permitida.');
    }
    const result = await this.apiKeyService.revoke(id, req.user.companyId);
    return result;
  }

  @Patch('keys/:id/webhook')
  async updateWebhook(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyWebhookDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Ação não permitida.');
    }

    return await this.apiKeyService.updateWebhook(
      id,
      req.user.companyId,
      dto.webhookUrl,
    );
  }

  @Post('keys/:id/webhook/rotate-secret')
  async rotateWebhookSecret(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Ação não permitida.');
    }

    return await this.apiKeyService.rotateWebhookSecret(id, req.user.companyId);
  }

  @Post('keys/:id/rotate-key')
  async rotateApiKey(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Ação não permitida.');
    }

    return await this.apiKeyService.rotateApiKey(id, req.user.companyId);
  }
}
