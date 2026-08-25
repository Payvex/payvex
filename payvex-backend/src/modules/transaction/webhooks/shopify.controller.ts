import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import * as express from 'express';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Controller('webhooks')
export class ShopifyWebhooksController {
  private readonly logger = new Logger(ShopifyWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('shopify')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: express.Request & { rawBody?: Buffer; body?: any },
    @Query('filialId') filialId?: string,
    @Headers('x-shopify-hmac-sha256') hmac?: string,
    @Headers('x-shopify-topic') topicHeader?: string,
    @Headers('x-shopify-shop-domain') shopDomain?: string,
  ) {
    const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET;
    if (!secret) {
      throw new BadRequestException('SHOPIFY_API_SECRET não configurado.');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Raw body ausente no webhook Shopify.');
    }

    if (!hmac || !this.verifyHmac(req.rawBody, hmac, secret)) {
      throw new UnauthorizedException('Assinatura Shopify inválida.');
    }

    const body = req.body || JSON.parse(req.rawBody.toString('utf8'));
    const topic = topicHeader || body?.topic || '';
    const resolvedFilialId =
      filialId || (await this.resolveFilialIdByShop(shopDomain));

    if (!resolvedFilialId) {
      this.logger.warn('Webhook Shopify ignorado: filial não identificada.');
      return { received: true, ignored: true };
    }

    if (topic === 'app/uninstalled') {
      await this.prisma.filial.update({
        where: { id: resolvedFilialId },
        data: {
          shopifyAccessToken: null,
          shopifyUrl: null,
          shopifyStoreId: null,
          shopifyApiVersion: null,
        },
      });
      return { received: true, topic, disconnected: true };
    }

    const status = this.mapTopicToStatus(topic);
    if (!status) {
      return { received: true, topic };
    }

    const transaction = await this.findTransaction(resolvedFilialId, body);
    if (!transaction) {
      this.logger.warn(
        `Webhook Shopify ${topic} sem transação correspondente para filial ${resolvedFilialId}.`,
      );
      return { received: true, topic, ignored: true };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status,
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          shopifyLastTopic: topic,
          shopifyShopDomain: shopDomain,
          shopifyOrderId: body?.id ? String(body.id) : undefined,
          shopifyOrderName: body?.name,
          shopifyLastPayload: body,
        },
      },
    });

    try {
      await this.apiKeyWebhookService.sendWebhook(transaction.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao disparar webhook Payvex: ${message}`);
    }

    return { received: true, topic, status };
  }

  private verifyHmac(rawBody: Buffer, received: string, secret: string) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('base64');
    return this.safeCompare(received, expected);
  }

  private safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private mapTopicToStatus(topic: string): TransactionStatus | null {
    if (topic === 'orders/paid') return TransactionStatus.PAID;
    if (topic === 'orders/cancelled') return TransactionStatus.CANCELED;
    return null;
  }

  private async resolveFilialIdByShop(shopDomain?: string) {
    if (!shopDomain) return null;
    const filial = await this.prisma.filial.findFirst({
      where: {
        OR: [
          { shopifyStoreId: { contains: shopDomain } },
          { shopifyUrl: { contains: shopDomain } },
        ],
      },
      select: { id: true },
    });
    return filial?.id || null;
  }

  private async findTransaction(filialId: string, body: any) {
    const values = [
      body?.id,
      body?.admin_graphql_api_id,
      body?.name,
      body?.order_number,
      body?.checkout_id,
      body?.cart_token,
    ]
      .filter(Boolean)
      .map((value) => String(value));

    for (const value of [...new Set(values)]) {
      const byExternalId = await this.prisma.transaction.findFirst({
        where: { filialId, externalId: value },
        select: { id: true, metadata: true },
      });
      if (byExternalId) return byExternalId;

      for (const key of ['shopifyOrderId', 'shopifyOrderName', 'orderId', 'externalOrderId', 'payvexReference']) {
        const byMetadata = await this.prisma.transaction.findFirst({
          where: {
            filialId,
            metadata: { path: [key], equals: value },
          },
          select: { id: true, metadata: true },
        });
        if (byMetadata) return byMetadata;
      }
    }

    return null;
  }
}
