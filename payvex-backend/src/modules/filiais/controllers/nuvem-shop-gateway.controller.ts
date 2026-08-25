/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FiliaisService } from '../services/filiais.service';
import { NuvemShopAdapter } from '../../transaction/gateways/adapters/nuvem-shop.adapter';

interface JwtRequest {
  user: {
    id: string;
    companyId: string;
    role: string;
    email: string;
  };
}

type NuvemShopState = {
  filialId: string;
  companyId: string;
  ts: number;
};

@Controller('filiais')
export class NuvemShopGatewayController {
  private readonly nuvemShopAdapter = new NuvemShopAdapter();

  constructor(private readonly filiaisService: FiliaisService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/nuvem-shop/connect')
  async connect(
    @Param('id') filialId: string,
    @Body()
      body: {
        accessToken?: string;
        storeId?: string;
      },
    @Request() req: JwtRequest,
  ) {
    if (!body?.accessToken || !body?.storeId) {
      throw new BadRequestException({
        message: 'accessToken e storeId são obrigatórios',
        code: 'MISSING_CREDENTIALS',
      } as unknown as object);
    }

    const accessToken = body.accessToken.trim();
    const storeId = body.storeId.trim();
    const connected = await this.nuvemShopAdapter.validate({
      accessToken,
      storeId,
    });

    if (!connected) {
      throw new BadRequestException('Credenciais Nuvemshop inválidas ou sem acesso à loja.');
    }

    const companyId = req.user.companyId;
    await this.filiaisService.connectNuvemShop(
      filialId,
      companyId,
      accessToken,
      storeId,
    );

    const webhookResult = await this.registerDefaultWebhooks(
      { accessToken, storeId },
      filialId,
    );

    return {
      connected: true,
      filialId,
      storeId,
      webhooksRegistered: webhookResult.registered,
      webhookWarning: webhookResult.warning,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/nuvem-shop/oauth/start')
  startOAuth(
    @Param('id') filialId: string,
    @Query('storeDomain') storeDomain: string | undefined,
    @Request() req: JwtRequest,
  ) {
    const config = this.getAppConfig();
    const authHost = (process.env.NUVEMSHOP_AUTH_HOST || 'https://www.tiendanube.com').replace(/\/+$/, '');
    const state = this.signState(
      { filialId, companyId: req.user.companyId, ts: Date.now() },
      config.clientSecret,
    );

    const url = storeDomain
      ? new URL(
          `https://${this.normalizeStoreDomain(storeDomain)}/admin/apps/${config.clientId}/authorize`,
        )
      : new URL(`${authHost}/apps/${config.clientId}/authorize`);
    url.searchParams.set('state', state);

    return { authorizationUrl: url.toString() };
  }

  @Get('gateways/nuvem-shop/oauth/callback')
  async callback(
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    const config = this.getAppConfig();
    const code = String(query.code || '');
    const state = String(query.state || '');

    if (!code || !state) {
      throw new BadRequestException('Callback Nuvemshop incompleto.');
    }

    const payload = this.verifyState(state, config.clientSecret);
    const tokenResponse = await axios.post(
      'https://www.tiendanube.com/apps/authorize/token',
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      },
    );

    const accessToken = tokenResponse.data?.access_token as string | undefined;
    const storeId = String(tokenResponse.data?.user_id || tokenResponse.data?.store_id || '');
    if (!accessToken || !storeId) {
      throw new BadRequestException('Nuvemshop não retornou access_token/store_id.');
    }

    await this.filiaisService.connectNuvemShop(
      payload.filialId,
      payload.companyId,
      accessToken,
      storeId,
    );

    await this.registerDefaultWebhooks(
      { accessToken, storeId },
      payload.filialId,
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return res.redirect(`${frontendUrl}/ecommerce?nuvemshop=connected`);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/nuvem-shop/disconnect')
  async disconnect(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    await this.filiaisService.disconnectNuvemShop(
      filialId,
      req.user.companyId,
    );
    return { connected: false, filialId };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/nuvem-shop/status')
  async status(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    const filial = await this.filiaisService.findFilialById(
      filialId,
      req.user.companyId,
    );

    const accessToken = this.filiaisService.decryptGatewayValue(
      filial?.nuvemShopAccessToken,
    );
    const storeId = this.filiaisService.decryptGatewayValue(
      filial?.nuvemShopStoreId,
    );

    const connected = await this.nuvemShopAdapter.validate({
      accessToken,
      storeId,
    });

    if (!connected) {
      return {
        connected: false,
        storeId: null,
      } as const;
    }

    return {
      connected: true,
      storeId,
      webhookUrl: process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/webhooks/nuvem-shop?filialId=${filialId}`
        : null,
    } as const;
  }

  private async registerDefaultWebhooks(
    credentials: {
      accessToken: string;
      storeId: string;
    },
    filialId: string,
  ) {
    try {
      await this.nuvemShopAdapter.registerDefaultWebhooks({
        ...credentials,
        filialId,
      });
      return { registered: Boolean(process.env.BACKEND_URL) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { registered: false, warning: message };
    }
  }

  private getAppConfig() {
    const clientId =
      process.env.NUVEMSHOP_CLIENT_ID ||
      process.env.TIENDANUBE_CLIENT_ID ||
      process.env.NUVEMSHOP_APP_ID;
    const clientSecret =
      process.env.NUVEMSHOP_CLIENT_SECRET ||
      process.env.TIENDANUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        'NUVEMSHOP_CLIENT_ID e NUVEMSHOP_CLIENT_SECRET precisam estar no .env.',
      );
    }

    return { clientId, clientSecret };
  }

  private normalizeStoreDomain(storeDomain: string) {
    return String(storeDomain || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
  }

  private signState(payload: NuvemShopState, secret: string) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', secret).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  private verifyState(state: string, secret: string): NuvemShopState {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new UnauthorizedException('State OAuth inválido.');
    }

    const expected = createHmac('sha256', secret).update(encoded).digest('hex');
    if (!this.safeCompare(signature, expected)) {
      throw new UnauthorizedException('State OAuth inválido.');
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as NuvemShopState;
    if (Date.now() - payload.ts > 10 * 60 * 1000) {
      throw new UnauthorizedException('State OAuth expirado.');
    }

    return payload;
  }

  private safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
