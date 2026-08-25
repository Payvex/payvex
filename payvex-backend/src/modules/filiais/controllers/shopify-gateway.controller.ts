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
import { ShopifyAdapter } from '../../transaction/gateways/adapters/shopify.adapter';

interface JwtRequest {
  user: {
    id: string;
    companyId: string;
    role: string;
    email: string;
  };
}

type ShopifyState = {
  filialId: string;
  companyId: string;
  ts: number;
};

@Controller('filiais')
export class ShopifyGatewayController {
  private readonly shopifyAdapter = new ShopifyAdapter();

  constructor(private readonly filiaisService: FiliaisService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/shopify/connect')
  async connect(
    @Param('id') filialId: string,
    @Body() body: { url?: string; accessToken?: string; storeId?: string; apiVersion?: string },
    @Request() req: JwtRequest,
  ) {
    const { companyId } = req.user;

    if (!body?.url || !body?.accessToken) {
      throw new BadRequestException({
        message: 'url e accessToken são obrigatórios',
        code: 'MISSING_ACCESS_TOKEN',
      } as unknown as object);
    }

    const baseUrl = this.normalizeBaseUrl(body.url);
    const storeId = body.storeId || this.normalizeShopDomain(baseUrl);
    const apiVersion = body.apiVersion || process.env.SHOPIFY_API_VERSION || '2026-07';
    const credentials = {
      baseUrl,
      accessToken: body.accessToken.trim(),
      shop: storeId,
      apiVersion,
    };

    const isValid = await this.shopifyAdapter.validate(credentials);
    if (!isValid) {
      throw new BadRequestException('Credenciais Shopify inválidas ou sem acesso ao Admin API.');
    }

    await this.filiaisService.connectShopify(
      filialId,
      companyId,
      credentials.accessToken,
      baseUrl,
      storeId,
      apiVersion,
    );

    const webhookResult = await this.registerDefaultWebhooks(credentials, filialId);

    return {
      connected: true,
      filialId,
      storeId,
      webhooksRegistered: webhookResult.registered,
      webhookWarning: webhookResult.warning,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/shopify/oauth/start')
  startOAuth(
    @Param('id') filialId: string,
    @Query('shop') shop: string,
    @Request() req: JwtRequest,
  ) {
    const config = this.getAppConfig();
    if (!shop) {
      throw new BadRequestException('Informe o domínio da loja Shopify.');
    }

    const shopDomain = this.normalizeShopDomain(shop);
    const state = this.signState(
      { filialId, companyId: req.user.companyId, ts: Date.now() },
      config.clientSecret,
    );
    const scopes =
      process.env.SHOPIFY_SCOPES ||
      'read_orders,write_orders,read_products,read_draft_orders,write_draft_orders';
    const redirectUri = this.getCallbackUrl('/filiais/gateways/shopify/oauth/callback');
    const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);

    return { authorizationUrl: url.toString() };
  }

  @Get('gateways/shopify/oauth/callback')
  async callback(
    @Query() query: Record<string, any>,
    @Res() res: Response,
  ) {
    const config = this.getAppConfig();
    const shop = this.normalizeShopDomain(String(query.shop || ''));
    const code = String(query.code || '');
    const state = String(query.state || '');

    if (!shop || !code || !state) {
      throw new BadRequestException('Callback Shopify incompleto.');
    }

    if (!this.verifyShopifyHmac(query, config.clientSecret)) {
      throw new UnauthorizedException('Assinatura HMAC Shopify inválida.');
    }

    const payload = this.verifyState(state, config.clientSecret);
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
      },
      { timeout: 30000 },
    );

    const accessToken = tokenResponse.data?.access_token as string | undefined;
    if (!accessToken) {
      throw new BadRequestException('Shopify não retornou access_token.');
    }

    const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';
    const baseUrl = `https://${shop}`;
    await this.filiaisService.connectShopify(
      payload.filialId,
      payload.companyId,
      accessToken,
      baseUrl,
      shop,
      apiVersion,
    );

    await this.registerDefaultWebhooks(
      { baseUrl, accessToken, shop, apiVersion },
      payload.filialId,
    );

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return res.redirect(`${frontendUrl}/ecommerce?shopify=connected`);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/gateways/shopify/disconnect')
  async disconnect(
    @Param('id') filialId: string,
    @Request() req: JwtRequest,
  ) {
    const { companyId } = req.user;
    await this.filiaisService.disconnectShopify(filialId, companyId);
    return { connected: false, filialId };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/gateways/shopify/status')
  async status(@Param('id') filialId: string, @Request() req: JwtRequest) {
    const filial = await this.filiaisService.findFilialById(
      filialId,
      req.user.companyId,
    );

    if (!filial?.shopifyUrl || !filial?.shopifyAccessToken) {
      return { connected: false };
    }

    try {
      const baseUrl = this.filiaisService.decryptGatewayValue(filial.shopifyUrl);
      const accessToken = this.filiaisService.decryptGatewayValue(
        filial.shopifyAccessToken,
      );
      const shop = this.filiaisService.decryptGatewayValue(filial.shopifyStoreId);

      const isValid = await this.shopifyAdapter.validate({
        baseUrl: baseUrl || '',
        accessToken: accessToken || '',
        shop: shop || '',
        apiVersion: filial.shopifyApiVersion || process.env.SHOPIFY_API_VERSION || '2026-07',
      });

      return {
        connected: isValid,
        url: baseUrl,
        storeId: shop,
        webhookUrl: process.env.BACKEND_URL
          ? `${process.env.BACKEND_URL.replace(/\/+$/, '')}/webhooks/shopify?filialId=${filialId}`
          : null,
      };
    } catch {
      return { connected: false };
    }
  }

  private async registerDefaultWebhooks(
    credentials: {
      baseUrl: string;
      accessToken: string;
      shop: string;
      apiVersion: string;
    },
    filialId: string,
  ) {
    try {
      await this.shopifyAdapter.registerDefaultWebhooks({
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
    const clientId = process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new BadRequestException('SHOPIFY_API_KEY e SHOPIFY_API_SECRET precisam estar no .env.');
    }

    return { clientId, clientSecret };
  }

  private getCallbackUrl(path: string) {
    const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '');
    if (!backendUrl) {
      throw new BadRequestException('BACKEND_URL precisa apontar para sua URL pública/ngrok.');
    }
    return `${backendUrl}${path}`;
  }

  private normalizeBaseUrl(url: string) {
    const domain = this.normalizeShopDomain(url);
    return `https://${domain}`;
  }

  private normalizeShopDomain(shop: string) {
    return String(shop || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
  }

  private signState(payload: ShopifyState, secret: string) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', secret).update(encoded).digest('hex');
    return `${encoded}.${signature}`;
  }

  private verifyState(state: string, secret: string): ShopifyState {
    const [encoded, signature] = state.split('.');
    if (!encoded || !signature) {
      throw new UnauthorizedException('State OAuth inválido.');
    }

    const expected = createHmac('sha256', secret).update(encoded).digest('hex');
    if (!this.safeCompare(signature, expected)) {
      throw new UnauthorizedException('State OAuth inválido.');
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ShopifyState;
    if (Date.now() - payload.ts > 10 * 60 * 1000) {
      throw new UnauthorizedException('State OAuth expirado.');
    }

    return payload;
  }

  private verifyShopifyHmac(query: Record<string, any>, secret: string) {
    const hmac = String(query.hmac || '');
    if (!hmac) return false;

    const message = Object.keys(query)
      .filter((key) => key !== 'hmac' && key !== 'signature')
      .sort()
      .map((key) => `${key}=${Array.isArray(query[key]) ? query[key].join(',') : query[key]}`)
      .join('&');
    const expected = createHmac('sha256', secret).update(message).digest('hex');
    return this.safeCompare(hmac, expected);
  }

  private safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }
}
