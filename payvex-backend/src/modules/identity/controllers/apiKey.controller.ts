/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
 
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
  Res, // 1. Adicione o decorador Res aqui
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express'; // 2. IMPORTANTE: Importe o Response do express
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateApiKeyDto } from '../dtos/create-api-key.dto';
import { UpdateApiKeyWebhookDto } from '../dtos/update-api-key-webhook.dto';
import { ApiKeyService } from '../services/apiKey.service';

@Controller('identity')
@UseGuards(JwtAuthGuard)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
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

  @Get('keys/:companyId') // 👈 Agora a rota espera o ID na URL
  async findAll(
    @Param('companyId') companyId: string, // 👈 Pega o ID da URL
    @Res() res: Response,
  ) {
    try {
      console.log(
        '--- [DEBUG] Buscando chaves para CompanyID da URL:',
        companyId,
      );

      if (!companyId) {
        return res.status(400).json({ message: 'CompanyID é obrigatório' });
      }

      const result = await this.apiKeyService.findAll(companyId);

      console.log('Chaves encontradas:', result.length);
      return res.status(200).json(result || []);
    } catch (error) {
      console.error('Erro no findAll:', error);
      return res.status(500).json([]);
    }
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
}
