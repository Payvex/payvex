/* eslint-disable prettier/prettier */
 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
 
 
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyAuthGuard } from 'src/auth/guards/api-key-auth.guard';
import { PluginTransactionsService } from '../services/plugin-transactions.service';

interface PluginRequest extends Request {
  apiKey: {
    id: string;
    filialId: string;
  };
}

@Controller('transactions/plugin')
@UseGuards(ApiKeyAuthGuard)
export class PluginTransactionsController {
  constructor(private readonly pluginTransactionsService: PluginTransactionsService) {}

  @Post('create')
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: Record<string, any>, @Req() req: PluginRequest) {
    if (!body?.amount) {
      throw new BadRequestException('amount é obrigatório.');
    }

    if (!body?.paymentMethod) {
      throw new BadRequestException('paymentMethod é obrigatório.');
    }

    return this.pluginTransactionsService.createTransactionForApiKey(req.apiKey.id, {
      ...body,
      amount: Number(body.amount),
      paymentMethod: String(body.paymentMethod).toUpperCase(),
      gateway: body.gateway ? String(body.gateway).toUpperCase() : undefined,
    });
  }

  @Get(':externalId')
  async findByExternalId(
    @Param('externalId') externalId: string,
    @Req() req: PluginRequest,
  ) {
    return this.pluginTransactionsService.findTransactionForApiKey(
      req.apiKey.id,
      externalId,
    );
  }
}
