/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
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
import axios from 'axios';
import type { Request } from 'express';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class CieloWebhooksController {
  private readonly logger = new Logger(CieloWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('cielo')
  @HttpCode(HttpStatus.OK)
  async handleCieloWebhook(
    @Req() req: Request,
    @Headers('paymentid') paymentIdHeader?: string,
    @Headers('PaymentId') paymentIdHeaderPascal?: string,
  ) {
    const body = req.body || {};
    const paymentId =
      body?.PaymentId ||
      body?.paymentId ||
      body?.Payment?.PaymentId ||
      paymentIdHeader ||
      paymentIdHeaderPascal;

    if (!paymentId) {
      this.logger.warn('Webhook Cielo ignorado: payload sem PaymentId.');
      return { received: true, ignored: true };
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { externalId: String(paymentId) },
      include: { filial: true },
    });

    if (!transaction) {
      this.logger.warn(
        `Webhook Cielo ignorado: transação ${paymentId} não encontrada.`,
      );
      return { received: true, ignored: true };
    }

    this.validateOptionalWebhookHeader(req, transaction.filial);

    const sale = await this.fetchSale(String(paymentId), transaction.filial);
    const payment = sale?.Payment || {};
    const status = this.mapStatus(payment.Status ?? body?.Status);

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        paymentUrl:
          payment.Url ||
          payment.BoletoUrl ||
          payment.AuthenticationUrl ||
          transaction.paymentUrl,
        pixQrCode:
          payment.QrCodeString ||
          payment.QrCodeBase64Image ||
          payment.QrCodeBase64 ||
          transaction.pixQrCode,
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          cieloPaymentId: paymentId,
          cieloStatus: payment.Status ?? body?.Status,
          cieloLastPayload: body,
          cieloSale: sale,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async fetchSale(paymentId: string, filial: any) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const merchantId = decryptWithKey(filial.cieloMerchantId, this.MASTER_KEY);
    const merchantKey = decryptWithKey(filial.cieloMerchantKey, this.MASTER_KEY);
    const queryUrl = filial.cieloSandbox
      ? 'https://apiquerysandbox.cieloecommerce.cielo.com.br'
      : 'https://apiquery.cieloecommerce.cielo.com.br';

    const response = await axios.get(`${queryUrl}/1/sales/${paymentId}`, {
      headers: {
        MerchantId: merchantId,
        MerchantKey: merchantKey,
      },
    });

    return response.data;
  }

  private validateOptionalWebhookHeader(req: Request, filial: any) {
    if (!filial.cieloWebhookHeaderKey || !filial.cieloWebhookHeaderValue) {
      this.logger.warn(
        'Header de webhook Cielo não configurado; evento aceito sem validação.',
      );
      return;
    }

    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const headerKey = decryptWithKey(
      filial.cieloWebhookHeaderKey,
      this.MASTER_KEY,
    ).toLowerCase();
    const expectedValue = decryptWithKey(
      filial.cieloWebhookHeaderValue,
      this.MASTER_KEY,
    );
    const receivedValue = req.headers[headerKey];
    const normalizedValue = Array.isArray(receivedValue)
      ? receivedValue[0]
      : receivedValue;

    if (!normalizedValue || normalizedValue !== expectedValue) {
      throw new UnauthorizedException('Header de webhook Cielo inválido.');
    }
  }

  private mapStatus(statusCode?: number | string): TransactionStatus | null {
    const status = Number(statusCode);

    if ([1, 2].includes(status)) return TransactionStatus.PAID;
    if ([10, 11, 12, 13].includes(status)) return TransactionStatus.CANCELED;
    if ([3].includes(status)) return TransactionStatus.FAILED;
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
