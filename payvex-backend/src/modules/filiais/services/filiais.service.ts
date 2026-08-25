/* eslint-disable prettier/prettier */

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey, encryptWithKey } from 'src/utils/security.util';
import { UpdateGatewayConfigDto } from '../dto/update-gateway-config.dto';

@Injectable()
export class FiliaisService {
  constructor(private prisma: PrismaService) {}

  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  private normalizeShopifyUrl(url: string) {
    const value = url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `https://${value}`;
  }

  async findFilialById(filialId: string, companyId: string) {
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialId },
    });

    if (!filial) {
      throw new NotFoundException('Filial não encontrada.');
    }

    if (filial.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado à esta filial.');
    }

    return filial;
  }

  private decryptToken(encryptedToken: string): string {
    if (!this.MASTER_KEY || !encryptedToken) return '';
    return decryptWithKey(encryptedToken, this.MASTER_KEY);
  }

  decryptGatewayValue(value?: string | null): string | undefined {
    return value ? this.decryptToken(value) : undefined;
  }

  private encryptToken(token: string): string {
    if (!this.MASTER_KEY) return token;
    return encryptWithKey(token, this.MASTER_KEY);
  }

  // Shopify Methods
  async connectShopify(
    filialId: string,
    companyId: string,
    accessToken: string,
    url?: string,
    storeId?: string,
    apiVersion?: string,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const token = accessToken.trim();
    const cleanUrl = url?.trim() ? this.normalizeShopifyUrl(url) : undefined;
    const cleanStoreId =
      storeId?.trim() || cleanUrl?.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (!token || !cleanUrl) {
      throw new BadRequestException('URL da loja e Access token da Shopify são obrigatórios');
    }

    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        shopifyAccessToken: this.encryptToken(token),
        shopifyUrl: this.encryptToken(cleanUrl),
        shopifyStoreId: cleanStoreId ? this.encryptToken(cleanStoreId) : null,
        shopifyApiVersion: apiVersion || '2026-07',
      },
    });
  }

  async clearShopifyByFilialId(filialId: string) {
    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        shopifyAccessToken: null,
        shopifyUrl: null,
        shopifyStoreId: null,
        shopifyApiVersion: null,
      },
    });
  }

  async disconnectShopify(filialId: string, companyId: string) {
    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        shopifyAccessToken: null,
        shopifyUrl: null,
        shopifyStoreId: null,
        shopifyApiVersion: null,
      },
    });
  }

  // WooCommerce Methods
  async connectWooCommerce(
    filialId: string,
    companyId: string,
    url: string,
    consumerKey: string,
    consumerSecret: string,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const cleanUrl = url.trim();
    const cleanKey = consumerKey.trim();
    const cleanSecret = consumerSecret.trim();

    if (!cleanUrl || !cleanKey || !cleanSecret) {
      throw new BadRequestException('URL, Consumer Key e Consumer Secret são obrigatórios');
    }

    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        woocommerceUrl: this.encryptToken(cleanUrl),
        woocommerceConsumerKey: this.encryptToken(cleanKey),
        woocommerceConsumerSecret: this.encryptToken(cleanSecret),
      },
    });
  }

  async disconnectWooCommerce(filialId: string, companyId: string) {
    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        woocommerceUrl: null,
        woocommerceConsumerKey: null,
        woocommerceConsumerSecret: null,
      },
    });
  }

  // Nuvem Shop Methods
  async connectNuvemShop(
    filialId: string,
    companyId: string,
    accessToken: string,
    storeId: string,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const token = accessToken.trim();
    const cleanStoreId = storeId.trim();
    if (!token || !cleanStoreId) {
      throw new BadRequestException('Access Token e Store ID da Nuvem Shop são obrigatórios');
    }

    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        nuvemShopAccessToken: this.encryptToken(token),
        nuvemShopStoreId: this.encryptToken(cleanStoreId),
        nuvemShopUrl: this.encryptToken(`https://api.tiendanube.com/v1/${cleanStoreId}`),
      },
    });
  }

  async clearNuvemShopByFilialId(filialId: string) {
    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        nuvemShopAccessToken: null,
        nuvemShopStoreId: null,
        nuvemShopUrl: null,
      },
    });
  }

  async disconnectNuvemShop(filialId: string, companyId: string) {
    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        nuvemShopAccessToken: null,
        nuvemShopStoreId: null,
        nuvemShopUrl: null,
      },
    });
  }

  // Mercado Pago Methods
  async connectMercadoPago(
    filialId: string,
    companyId: string,
    accessToken: string,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const token = accessToken.trim();
    if (!token) {
      throw new BadRequestException('Access Token do Mercado Pago é obrigatório');
    }

    const filial = await this.findFilialById(filialId, companyId);

    // Criptografar o token antes de salvar
    const encryptedToken = this.encryptToken(token);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        mercadoPagoAccessToken: encryptedToken,
      },
    });
  }

  async disconnectMercadoPago(filialId: string, companyId: string) {
    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        mercadoPagoAccessToken: null,
      },
    });
  }

  decryptMercadoPagoToken(encryptedToken: string): string {
    return this.decryptToken(encryptedToken);
  }

  // Stripe Methods
  async connectStripe(
    filialId: string,
    companyId: string,
    publicKey: string,
    secretKey: string,
    webhookSecret: string,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const cleanPubKey = publicKey.trim();
    const cleanSecKey = secretKey.trim();
    const cleanWebhook = webhookSecret.trim();

    if (!cleanPubKey || !cleanSecKey) {
      throw new BadRequestException('PublicKey e SecretKey são obrigatórios');
    }

    const filial = await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        stripePublicKey: this.encryptToken(cleanPubKey),
        stripeSecretKey: this.encryptToken(cleanSecKey),
        stripeWebhookSecret: cleanWebhook ? this.encryptToken(cleanWebhook) : null,
      },
    });
  }

  async disconnectStripe(filialId: string, companyId: string) {
    await this.findFilialById(filialId, companyId);

    return this.prisma.filial.update({
      where: { id: filialId },
      data: {
        stripePublicKey: null,
        stripeSecretKey: null,
        stripeWebhookSecret: null,
      },
    });
  }

  // Update Gateway Keys - Generic method
  // Persiste e criptografa TODOS os campos de gateway definidos no schema,
  // espelhando exatamente as colunas do modelo Filial em
  // prisma/schema.prisma. Usa um mapeamento centralizado para evitar
  // corrupção de linha e manter a manutenção simples.
  async updateGatewayKeys(
    filialId: string,
    companyId: string,
    dto: UpdateGatewayConfigDto,
  ) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY não definida');
    }

    const filial = await this.findFilialById(filialId, companyId);

    // 🗝️ Campo texto/secret → criptografado quando informado, null para limpar.
    const enc = (v: string | undefined | null): any => {
      if (!v) return null;
      if (!this.MASTER_KEY) return v;
      return encryptWithKey(v, this.MASTER_KEY);
    };

    /**
     * Mapeamento DTO field → Filial column, agrupado por gateway.
     * Mantém a relação entre o nome da propriedade no DTO e a coluna
     * no Prisma, de forma centralizada e legível.
     */
    const fieldMap: Array<{
      dtoKey: keyof UpdateGatewayConfigDto;
      col: string;
      kind: 'text' | 'bool';
    }> = [
      // Stripe
      { dtoKey: 'stripePublicKey',     col: 'stripePublicKey',     kind: 'text' },
      { dtoKey: 'stripeSecretKey',     col: 'stripeSecretKey',     kind: 'text' },
      { dtoKey: 'stripeWebhookSecret', col: 'stripeWebhookSecret', kind: 'text' },
      // Mercado Pago
      { dtoKey: 'mercadoPagoAccessToken', col: 'mercadoPagoAccessToken', kind: 'text' },
      { dtoKey: 'mercadoPagoWebhookSecret', col: 'mercadoPagoWebhookSecret', kind: 'text' },
      // Pagar.me
      { dtoKey: 'pagarMeAccessToken', col: 'pagarMeAccessToken', kind: 'text' },
      { dtoKey: 'pagarMePublicKey', col: 'pagarMePublicKey', kind: 'text' },
      // PagBank
      { dtoKey: 'pagarBankPrivateKey', col: 'pagarBankPrivateKey', kind: 'text' },
      { dtoKey: 'pagarBankSandbox', col: 'pagarBankSandbox', kind: 'bool' },
      // Asaas
      { dtoKey: 'asaasApiKey', col: 'asaasApiKey', kind: 'text' },
      { dtoKey: 'asaasWebhookToken', col: 'asaasWebhookToken', kind: 'text' },
      { dtoKey: 'asaasSandbox', col: 'asaasSandbox', kind: 'bool' },
      // Cielo
      { dtoKey: 'cieloMerchantId',  col: 'cieloMerchantId',  kind: 'text' },
      { dtoKey: 'cieloMerchantKey', col: 'cieloMerchantKey', kind: 'text' },
      { dtoKey: 'cieloWebhookHeaderKey', col: 'cieloWebhookHeaderKey', kind: 'text' },
      { dtoKey: 'cieloWebhookHeaderValue', col: 'cieloWebhookHeaderValue', kind: 'text' },
      { dtoKey: 'cieloSandbox',     col: 'cieloSandbox',     kind: 'bool' },
      // Stone
      { dtoKey: 'stoneApiKey',   col: 'stoneApiKey',   kind: 'text' },
      { dtoKey: 'stoneClientId', col: 'stoneClientId', kind: 'text' },
      { dtoKey: 'stoneSecret',   col: 'stoneSecret',   kind: 'text' },
      { dtoKey: 'stoneSandbox',  col: 'stoneSandbox',  kind: 'bool' },
      // NOWPayments
      { dtoKey: 'nowPaymentsApiKey', col: 'nowPaymentsApiKey', kind: 'text' },
      { dtoKey: 'nowPaymentsIpnSecret', col: 'nowPaymentsIpnSecret', kind: 'text' },
      // Coinbase Commerce
      { dtoKey: 'coinbaseCommerceApiKey', col: 'coinbaseCommerceApiKey', kind: 'text' },
      { dtoKey: 'coinbaseCommerceWebhookSecret', col: 'coinbaseCommerceWebhookSecret', kind: 'text' },
      // BitPay
      { dtoKey: 'bitPayToken', col: 'bitPayToken', kind: 'text' },
      { dtoKey: 'bitPaySandbox', col: 'bitPaySandbox', kind: 'bool' },
      // PicPay
      { dtoKey: 'picPayPublicKey', col: 'picPayPublicKey', kind: 'text' },
      { dtoKey: 'picPayClientId', col: 'picPayClientId', kind: 'text' },
      { dtoKey: 'picPayClientSecret', col: 'picPayClientSecret', kind: 'text' },
      { dtoKey: 'picPaySellerToken', col: 'picPaySellerToken', kind: 'text' },
      // PagSeguro
      { dtoKey: 'pagSeguroEmail',   col: 'pagSeguroEmail',   kind: 'text' },
      { dtoKey: 'pagSeguroToken',   col: 'pagSeguroToken',   kind: 'text' },
      { dtoKey: 'pagSeguroSalt',    col: 'pagSeguroSalt',    kind: 'text' },
      { dtoKey: 'pagSeguroSandbox', col: 'pagSeguroSandbox', kind: 'bool' },
      // WooCommerce
      { dtoKey: 'woocommerceUrl',            col: 'woocommerceUrl',            kind: 'text' },
      { dtoKey: 'woocommerceConsumerKey',    col: 'woocommerceConsumerKey',    kind: 'text' },
      { dtoKey: 'woocommerceConsumerSecret', col: 'woocommerceConsumerSecret', kind: 'text' },
      // Nuvem Shop
      { dtoKey: 'nuvemShopUrl',         col: 'nuvemShopUrl',         kind: 'text' },
      { dtoKey: 'nuvemShopAccessToken', col: 'nuvemShopAccessToken', kind: 'text' },
      { dtoKey: 'nuvemShopStoreId',     col: 'nuvemShopStoreId',     kind: 'text' },
    ];

    const data: Record<string, any> = {};
    for (const f of fieldMap) {
      if (!Object.prototype.hasOwnProperty.call(dto, f.dtoKey)) {
        continue;
      }

      const val = dto[f.dtoKey];
      if (f.kind === 'bool') {
        data[f.col] = val ?? false;
      } else {
        data[f.col] = enc(val as string | undefined | null);
      }
    }

    if (Object.keys(data).length === 0) {
      return filial;
    }

    return this.prisma.filial.update({
      where: { id: filialId },
      data,
    });
  }
}
