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
export class NuvemShopWebhooksController {
  private readonly logger = new Logger(NuvemShopWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('nuvem-shop')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: express.Request & { rawBody?: Buffer; body?: any },
    @Query('filialId') filialId?: string,
    @Headers('x-linkedstore-hmac-sha256') hmac?: string,
  ) {
    const secret =
      process.env.NUVEMSHOP_CLIENT_SECRET ||
      process.env.TIENDANUBE_CLIENT_SECRET;

    if (!secret) {
      throw new BadRequestException('NUVEMSHOP_CLIENT_SECRET não configurado.');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Raw body ausente no webhook Nuvemshop.');
    }

    if (!hmac || !this.verifyHmac(req.rawBody, hmac, secret)) {
      throw new UnauthorizedException('Assinatura Nuvemshop inválida.');
    }

    const body = req.body || JSON.parse(req.rawBody.toString('utf8'));
    const event = String(body?.event || '');
    const resolvedFilialId =
      filialId || (await this.resolveFilialIdByStoreId(String(body?.store_id || '')));

    if (!resolvedFilialId) {
      this.logger.warn('Webhook Nuvemshop ignorado: filial não identificada.');
      return { received: true, ignored: true };
    }

    if (event === 'app/uninstalled') {
      await this.prisma.filial.update({
        where: { id: resolvedFilialId },
        data: {
          nuvemShopAccessToken: null,
          nuvemShopStoreId: null,
          nuvemShopUrl: null,
        },
      });
      return { received: true, event, disconnected: true };
    }

    const status = this.mapEventToStatus(event);
    if (!status) {
      return { received: true, event };
    }

    const transaction = await this.findTransaction(resolvedFilialId, body);
    if (!transaction) {
      this.logger.warn(
        `Webhook Nuvemshop ${event} sem transação correspondente para filial ${resolvedFilialId}.`,
      );
      return { received: true, event, ignored: true };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status,
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          nuvemShopLastEvent: event,
          nuvemShopStoreId: body?.store_id ? String(body.store_id) : undefined,
          nuvemShopOrderId: this.extractOrderId(body),
          nuvemShopLastPayload: body,
        },
      },
    });

    try {
      await this.apiKeyWebhookService.sendWebhook(transaction.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao disparar webhook Payvex: ${message}`);
    }

    return { received: true, event, status };
  }

  private verifyHmac(rawBody: Buffer, received: string, secret: string) {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return this.safeCompare(received, expected);
  }

  private safeCompare(a: string, b: string) {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private mapEventToStatus(event: string): TransactionStatus | null {
    if (event === 'order/paid') return TransactionStatus.PAID;
    if (['order/cancelled', 'order/voided'].includes(event)) {
      return TransactionStatus.CANCELED;
    }
    return null;
  }

  private extractOrderId(body: any) {
    return String(
      body?.id ||
        body?.order_id ||
        body?.order?.id ||
        body?.resource_id ||
        body?.resource?.id ||
        '',
    );
  }

  private async resolveFilialIdByStoreId(storeId: string) {
    if (!storeId) return null;
    const filial = await this.prisma.filial.findFirst({
      where: { nuvemShopStoreId: { contains: storeId } },
      select: { id: true },
    });
    return filial?.id || null;
  }

  private async findTransaction(filialId: string, body: any) {
    const orderId = this.extractOrderId(body);
    const values = [
      orderId,
      body?.id,
      body?.order_id,
      body?.resource_id,
      body?.order?.id,
      body?.order?.number,
    ]
      .filter(Boolean)
      .map((value) => String(value));

    for (const value of [...new Set(values)]) {
      const byExternalId = await this.prisma.transaction.findFirst({
        where: { filialId, externalId: value },
        select: { id: true, metadata: true },
      });
      if (byExternalId) return byExternalId;

      for (const key of ['nuvemShopOrderId', 'orderId', 'externalOrderId', 'payvexReference']) {
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
