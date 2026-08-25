/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Controller('webhooks')
export class PagarMeWebhooksController {
  private readonly logger = new Logger(PagarMeWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('pagarme')
  @HttpCode(HttpStatus.OK)
  async handlePagarMeWebhook(@Body() body: any) {
    const event = String(body?.type || body?.event || '');
    const data = body?.data || {};
    const orderId = this.resolveOrderId(data);
    const chargeId = this.resolveChargeId(data);
    const payvexReference = this.resolvePayvexReference(data);

    if (!event || (!orderId && !chargeId && !payvexReference)) {
      this.logger.warn('Evento Pagar.me ignorado: payload sem identificador.');
      return { received: true, ignored: true };
    }

    const transaction = await this.findTransaction(orderId, chargeId, payvexReference);
    if (!transaction) {
      this.logger.warn(
        `Evento Pagar.me ${event} ignorado: transação não encontrada.`,
      );
      return { received: true, ignored: true };
    }

    const status = this.mapEventToStatus(event, data?.status);
    const metadata = {
      ...((transaction.metadata as Record<string, any>) || {}),
      pagarmeLastEvent: event,
      pagarmeOrderId: orderId,
      pagarmeChargeId: chargeId,
      pagarmeStatus: data?.status,
      pagarmeLastPayload: body,
    };

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata,
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, event, status: status || 'NO_CHANGE' };
  }

  private resolveOrderId(data: any): string | undefined {
    return (
      data?.order?.id ||
      data?.order_id ||
      (String(data?.id || '').startsWith('or_') ? data.id : undefined)
    );
  }

  private resolveChargeId(data: any): string | undefined {
    return (
      data?.charge?.id ||
      data?.charge_id ||
      (String(data?.id || '').startsWith('ch_') ? data.id : undefined)
    );
  }

  private resolvePayvexReference(data: any): string | undefined {
    return (
      data?.metadata?.payvexReference ||
      data?.order?.metadata?.payvexReference ||
      data?.code ||
      data?.order?.code
    );
  }

  private async findTransaction(
    orderId?: string,
    chargeId?: string,
    payvexReference?: string,
  ) {
    if (orderId) {
      const byOrderId = await this.prisma.transaction.findFirst({
        where: { externalId: orderId },
        select: { id: true, metadata: true },
      });
      if (byOrderId) return byOrderId;
    }

    if (chargeId) {
      const byChargeId = await this.prisma.transaction.findFirst({
        where: { externalId: chargeId },
        select: { id: true, metadata: true },
      });
      if (byChargeId) return byChargeId;
    }

    if (payvexReference) {
      return this.prisma.transaction.findFirst({
        where: {
          metadata: { path: ['payvexReference'], equals: payvexReference },
        },
        select: { id: true, metadata: true },
      });
    }

    return null;
  }

  private mapEventToStatus(
    event: string,
    rawStatus?: string,
  ): TransactionStatus | null {
    const normalizedEvent = event.toLowerCase();
    const normalizedStatus = String(rawStatus || '').toLowerCase();

    if (
      ['order.paid', 'charge.paid'].includes(normalizedEvent) ||
      ['paid'].includes(normalizedStatus)
    ) {
      return TransactionStatus.PAID;
    }

    if (
      [
        'order.payment_failed',
        'charge.payment_failed',
        'charge.failed',
        'charge.antifraud_reproved',
      ].includes(normalizedEvent) ||
      ['failed', 'payment_failed'].includes(normalizedStatus)
    ) {
      return TransactionStatus.FAILED;
    }

    if (
      [
        'order.canceled',
        'charge.refunded',
        'charge.partial_canceled',
        'charge.chargedback',
        'chargeback.received',
      ].includes(normalizedEvent) ||
      ['canceled', 'cancelled', 'refunded', 'chargedback'].includes(
        normalizedStatus,
      )
    ) {
      return TransactionStatus.CANCELED;
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
