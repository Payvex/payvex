/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import * as express from 'express';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class CoinbaseCommerceWebhooksController {
  private readonly logger = new Logger(CoinbaseCommerceWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('coinbase-commerce')
  @HttpCode(HttpStatus.OK)
  async handleCoinbaseCommerceWebhook(
    @Body() body: any,
    @Req() req: express.Request & { rawBody?: Buffer },
    @Headers('x-cc-webhook-signature') signature?: string,
  ) {
    const event = body?.event || body;
    const charge = event?.data || {};
    const metadata = charge?.metadata || {};
    const identifiers = [
      charge?.id,
      charge?.code,
      metadata?.payvexReference,
    ].filter(Boolean);

    const transaction = await this.findTransaction(identifiers.map(String));
    if (!transaction) {
      this.logger.warn(
        `Webhook Coinbase Commerce ignorado: transação não encontrada para ${identifiers.join(', ') || 'sem id'}.`,
      );
      return { received: true, ignored: true };
    }

    this.validateSignature(transaction.filial, req.rawBody, signature);

    const status = this.mapStatus(event?.type, charge?.timeline);
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          coinbaseChargeId: charge?.id,
          coinbaseChargeCode: charge?.code,
          coinbaseEventType: event?.type,
          coinbaseLastPayload: body,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async findTransaction(identifiers: string[]) {
    for (const value of identifiers) {
      const byExternalId = await this.prisma.transaction.findFirst({
        where: { externalId: value },
        include: { filial: true },
      });
      if (byExternalId) return byExternalId;

      const byPayvexReference = await this.prisma.transaction.findFirst({
        where: { metadata: { path: ['payvexReference'], equals: value } },
        include: { filial: true },
      });
      if (byPayvexReference) return byPayvexReference;
    }

    return null;
  }

  private validateSignature(
    filial: any,
    rawBody?: Buffer,
    signature?: string,
  ) {
    if (!filial.coinbaseCommerceWebhookSecret) {
      this.logger.warn(
        'coinbaseCommerceWebhookSecret não configurado; webhook Coinbase aceito sem validação.',
      );
      return;
    }

    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }
    if (!rawBody) {
      throw new UnauthorizedException('Raw body ausente no webhook Coinbase.');
    }

    const secret = decryptWithKey(
      filial.coinbaseCommerceWebhookSecret,
      this.MASTER_KEY,
    );
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    if (!signature || !this.safeCompare(expected, signature)) {
      throw new UnauthorizedException('Assinatura Coinbase Commerce inválida.');
    }
  }

  private safeCompare(expected: string, received: string): boolean {
    const left = Buffer.from(expected);
    const right = Buffer.from(received);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private mapStatus(
    eventType?: string,
    timeline?: Array<{ status?: string }>,
  ): TransactionStatus | null {
    const type = String(eventType || '').toLowerCase();
    if (type === 'charge:confirmed' || type === 'charge:resolved') {
      return TransactionStatus.PAID;
    }
    if (type === 'charge:failed') return TransactionStatus.FAILED;
    if (type === 'charge:pending' || type === 'charge:created') {
      return TransactionStatus.PENDING;
    }

    const lastTimelineStatus = String(
      timeline && timeline.length > 0 ? timeline[timeline.length - 1]?.status : '',
    ).toLowerCase();
    if (lastTimelineStatus === 'completed') return TransactionStatus.PAID;
    if (lastTimelineStatus === 'expired') return TransactionStatus.EXPIRED;
    return null;
  }

  private async sendPayvexWebhook(transactionId: string) {
    try {
      await this.apiKeyWebhookService.sendWebhook(transactionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao disparar webhook Payvex: ${message}`);
    }
  }
}
