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
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class NowPaymentsWebhooksController {
  private readonly logger = new Logger(NowPaymentsWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('nowpayments')
  @HttpCode(HttpStatus.OK)
  async handleNowPaymentsWebhook(
    @Body() body: any,
    @Headers('x-nowpayments-sig') signature?: string,
  ) {
    const identifiers = [
      body?.payment_id,
      body?.invoice_id,
      body?.id,
      body?.order_id,
      body?.purchase_id,
    ].filter(Boolean);

    const transaction = await this.findTransaction(identifiers.map(String));
    if (!transaction) {
      this.logger.warn(
        `Webhook NOWPayments ignorado: transação não encontrada para ${identifiers.join(', ') || 'sem id'}.`,
      );
      return { received: true, ignored: true };
    }

    this.validateSignature(transaction.filial, body, signature);

    const status = this.mapStatus(body?.payment_status || body?.status);
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          nowPaymentsPaymentId: body?.payment_id,
          nowPaymentsInvoiceId: body?.invoice_id || body?.id,
          nowPaymentsStatus: body?.payment_status || body?.status,
          nowPaymentsLastPayload: body,
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

  private validateSignature(filial: any, body: any, signature?: string) {
    if (!filial.nowPaymentsIpnSecret) {
      this.logger.warn(
        'nowPaymentsIpnSecret não configurado; IPN NOWPayments aceito sem validação.',
      );
      return;
    }

    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const secret = decryptWithKey(filial.nowPaymentsIpnSecret, this.MASTER_KEY);
    const expected = createHmac('sha512', secret)
      .update(JSON.stringify(this.sortObject(body)))
      .digest('hex');

    if (!signature || !this.safeCompare(expected, signature)) {
      throw new UnauthorizedException('Assinatura NOWPayments inválida.');
    }
  }

  private sortObject(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortObject(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value)
        .sort()
        .reduce((acc: Record<string, any>, key) => {
          acc[key] = this.sortObject(value[key]);
          return acc;
        }, {});
    }
    return value;
  }

  private safeCompare(expected: string, received: string): boolean {
    const left = Buffer.from(expected);
    const right = Buffer.from(received);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private mapStatus(rawStatus?: string): TransactionStatus | null {
    const status = String(rawStatus || '').toLowerCase();
    if (status === 'finished') return TransactionStatus.PAID;
    if (['expired', 'failed'].includes(status)) return TransactionStatus.FAILED;
    if (['refunded', 'chargeback'].includes(status)) return TransactionStatus.CANCELED;
    if (['waiting', 'confirming', 'confirmed', 'sending', 'partially_paid'].includes(status)) {
      return TransactionStatus.PENDING;
    }
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
