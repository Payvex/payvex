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
import axios from 'axios';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class BitPayWebhooksController {
  private readonly logger = new Logger(BitPayWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('bitpay')
  @HttpCode(HttpStatus.OK)
  async handleBitPayWebhook(@Body() body: any) {
    const invoice = body?.data || body;
    const invoiceId = invoice?.id;
    const orderId = invoice?.orderId;
    const posData = this.parsePosData(invoice?.posData);
    const identifiers = [
      invoiceId,
      orderId,
      posData?.payvexReference,
    ].filter(Boolean);

    const transaction = await this.findTransaction(identifiers.map(String));
    if (!transaction) {
      this.logger.warn(
        `Webhook BitPay ignorado: transação não encontrada para ${identifiers.join(', ') || 'sem id'}.`,
      );
      return { received: true, ignored: true };
    }

    const confirmedInvoice = invoiceId
      ? await this.fetchInvoice(String(invoiceId), transaction.filial)
      : invoice;
    const confirmedStatus = confirmedInvoice?.status || invoice?.status;
    const status = this.mapStatus(confirmedStatus);

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          bitPayInvoiceId: invoiceId,
          bitPayOrderId: orderId,
          bitPayStatus: confirmedStatus,
          bitPayLastPayload: body,
          bitPayConfirmedInvoice: confirmedInvoice,
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

  private async fetchInvoice(invoiceId: string, filial: any) {
    if (!filial.bitPayToken || !this.MASTER_KEY) return null;

    const token = decryptWithKey(filial.bitPayToken, this.MASTER_KEY);
    const baseUrl = filial.bitPaySandbox
      ? 'https://test.bitpay.com'
      : 'https://bitpay.com';
    const response = await axios.get(`${baseUrl}/invoices/${invoiceId}`, {
      params: { token },
      headers: {
        'Content-Type': 'application/json',
        'X-Accept-Version': '2.0.0',
      },
    });

    return response.data?.data || response.data;
  }

  private parsePosData(raw: any): Record<string, any> | null {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
      return JSON.parse(String(raw));
    } catch {
      return null;
    }
  }

  private mapStatus(rawStatus?: string): TransactionStatus | null {
    const status = String(rawStatus || '').toLowerCase();
    if (['confirmed', 'complete'].includes(status)) return TransactionStatus.PAID;
    if (status === 'expired') return TransactionStatus.EXPIRED;
    if (['invalid', 'declined'].includes(status)) return TransactionStatus.FAILED;
    if (['refunded', 'canceled', 'cancelled'].includes(status)) {
      return TransactionStatus.CANCELED;
    }
    if (['new', 'paid'].includes(status)) return TransactionStatus.PENDING;
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
