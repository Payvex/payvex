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
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Controller('webhooks')
export class PagBankWebhooksController {
  private readonly logger = new Logger(PagBankWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('pagbank')
  @HttpCode(HttpStatus.OK)
  async handlePagBankWebhook(
    @Body() body: any,
    @Headers('x-product-id') productId?: string,
    @Headers('x-product-origin') productOrigin?: string,
  ) {
    const orderId = body?.id || productId;
    const chargeId = body?.charges?.[0]?.id;
    const referenceId = body?.reference_id || body?.charges?.[0]?.reference_id;

    if (!orderId && !chargeId && !referenceId) {
      this.logger.warn('Webhook PagBank ignorado: payload sem identificador.');
      return { received: true, ignored: true };
    }

    const transaction = await this.findTransaction(orderId, chargeId, referenceId);
    if (!transaction) {
      this.logger.warn(
        `Webhook PagBank ignorado: transação não encontrada para ${orderId || chargeId || referenceId}.`,
      );
      return { received: true, ignored: true };
    }

    const rawStatus =
      body?.charges?.[0]?.status ||
      body?.status ||
      body?.qr_codes?.[0]?.status ||
      '';
    const status = this.mapStatus(rawStatus);
    const pixQrCode = body?.qr_codes?.[0]?.text || transaction.pixQrCode;
    const paymentUrl =
      this.findLink(body, ['BOLETO.PDF', 'BOLETO', 'QRCODE.PNG']) ||
      transaction.paymentUrl;

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        pixQrCode,
        paymentUrl,
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          pagbankOrderId: orderId,
          pagbankChargeId: chargeId,
          pagbankReferenceId: referenceId,
          pagbankStatus: rawStatus,
          pagbankProductOrigin: productOrigin,
          pagbankLastPayload: body,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async findTransaction(
    orderId?: string,
    chargeId?: string,
    referenceId?: string,
  ) {
    if (orderId) {
      const byOrder = await this.prisma.transaction.findFirst({
        where: { externalId: orderId },
        select: { id: true, metadata: true, pixQrCode: true, paymentUrl: true },
      });
      if (byOrder) return byOrder;
    }

    if (chargeId) {
      const byCharge = await this.prisma.transaction.findFirst({
        where: { externalId: chargeId },
        select: { id: true, metadata: true, pixQrCode: true, paymentUrl: true },
      });
      if (byCharge) return byCharge;
    }

    if (referenceId) {
      return this.prisma.transaction.findFirst({
        where: { metadata: { path: ['payvexReference'], equals: referenceId } },
        select: { id: true, metadata: true, pixQrCode: true, paymentUrl: true },
      });
    }

    return null;
  }

  private mapStatus(rawStatus?: string): TransactionStatus | null {
    const status = String(rawStatus || '').toUpperCase();
    if (status === 'PAID') return TransactionStatus.PAID;
    if (status === 'DECLINED') return TransactionStatus.FAILED;
    if (['CANCELED', 'CANCELLED', 'REFUNDED'].includes(status)) {
      return TransactionStatus.CANCELED;
    }
    return null;
  }

  private findLink(order: any, rels: string[]): string | undefined {
    const links = [
      ...(Array.isArray(order?.links) ? order.links : []),
      ...(Array.isArray(order?.charges?.[0]?.links) ? order.charges[0].links : []),
      ...(Array.isArray(order?.qr_codes?.[0]?.links) ? order.qr_codes[0].links : []),
    ];

    for (const rel of rels) {
      const found = links.find(
        (link: any) => String(link?.rel || '').toUpperCase() === rel,
      );
      if (found?.href) return found.href;
    }

    return undefined;
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
