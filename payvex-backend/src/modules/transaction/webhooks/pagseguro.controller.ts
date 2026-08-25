/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import axios from 'axios';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class PagSeguroWebhooksController {
  private readonly logger = new Logger(PagSeguroWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('pagseguro')
  @HttpCode(HttpStatus.OK)
  async handlePagSeguroWebhook(
    @Body() body: any,
    @Query('filialId') filialId?: string,
  ) {
    const notificationCode =
      body?.notificationCode ||
      body?.notificationcode ||
      body?.notification_code;
    const notificationType =
      body?.notificationType ||
      body?.notificationtype ||
      body?.notification_type;

    if (!notificationCode) {
      this.logger.warn('Webhook PagSeguro ignorado: sem notificationCode.');
      return { received: true, ignored: true };
    }

    if (notificationType && notificationType !== 'transaction') {
      return { received: true, ignored: true, notificationType };
    }

    const resolved = await this.fetchNotificationWithCredentials(
      String(notificationCode),
      filialId,
    );
    if (!resolved) {
      this.logger.warn(
        `Webhook PagSeguro ignorado: não foi possível consultar ${notificationCode}.`,
      );
      return { received: true, ignored: true };
    }

    const transactionData = this.parseTransactionXml(resolved.xml);
    const reference = transactionData.reference;
    const transactionCode = transactionData.code;
    const transaction = await this.findTransaction(reference, transactionCode);

    if (!transaction) {
      this.logger.warn(
        `Webhook PagSeguro ignorado: transação não encontrada para ${reference || transactionCode}.`,
      );
      return { received: true, ignored: true };
    }

    const status = this.mapStatus(transactionData.status);
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        ...(transactionCode && transaction.externalId !== transactionCode
          ? { externalId: transactionCode }
          : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          pagSeguroNotificationCode: notificationCode,
          pagSeguroTransactionCode: transactionCode,
          pagSeguroReference: reference,
          pagSeguroStatus: transactionData.status,
          pagSeguroGrossAmount: transactionData.grossAmount,
          pagSeguroPaymentMethod: transactionData.paymentMethod,
          pagSeguroLastPayload: body,
          pagSeguroLastXml: resolved.xml,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async fetchNotificationWithCredentials(
    notificationCode: string,
    filialId?: string,
  ): Promise<{ xml: string; filialId: string } | null> {
    const filiais = filialId
      ? await this.prisma.filial.findMany({
          where: { id: filialId },
          select: {
            id: true,
            pagSeguroEmail: true,
            pagSeguroToken: true,
            pagSeguroSandbox: true,
          },
        })
      : await this.prisma.filial.findMany({
          where: {
            pagSeguroEmail: { not: null },
            pagSeguroToken: { not: null },
          },
          select: {
            id: true,
            pagSeguroEmail: true,
            pagSeguroToken: true,
            pagSeguroSandbox: true,
          },
        });

    for (const filial of filiais) {
      if (!filial.pagSeguroEmail || !filial.pagSeguroToken) continue;

      try {
        const xml = await this.fetchNotification(notificationCode, filial);
        return { xml, filialId: filial.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Falha ao consultar notificação PagSeguro para filial ${filial.id}: ${message}`,
        );
      }
    }

    return null;
  }

  private async fetchNotification(notificationCode: string, filial: any) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const email = decryptWithKey(filial.pagSeguroEmail, this.MASTER_KEY);
    const token = decryptWithKey(filial.pagSeguroToken, this.MASTER_KEY);
    const baseUrl = filial.pagSeguroSandbox
      ? 'https://ws.sandbox.pagseguro.uol.com.br'
      : 'https://ws.pagseguro.uol.com.br';

    const response = await axios.get(
      `${baseUrl}/v3/transactions/notifications/${encodeURIComponent(
        notificationCode,
      )}`,
      {
        params: { email, token },
        headers: { Accept: 'application/xml' },
        responseType: 'text',
      },
    );

    return String(response.data || '');
  }

  private parseTransactionXml(xml: string) {
    return {
      code: this.extractXmlTag(xml, 'code'),
      reference: this.extractXmlTag(xml, 'reference'),
      status: this.extractXmlTag(xml, 'status'),
      grossAmount: this.extractXmlTag(xml, 'grossAmount'),
      paymentMethod: {
        type: this.extractXmlTag(xml, 'type'),
        code: this.extractXmlTag(xml, 'code', 'paymentMethod'),
      },
    };
  }

  private async findTransaction(reference?: string, transactionCode?: string) {
    if (reference) {
      const byReference = await this.prisma.transaction.findFirst({
        where: { metadata: { path: ['payvexReference'], equals: reference } },
        select: { id: true, externalId: true, metadata: true },
      });
      if (byReference) return byReference;
    }

    if (transactionCode) {
      return this.prisma.transaction.findFirst({
        where: { externalId: transactionCode },
        select: { id: true, externalId: true, metadata: true },
      });
    }

    return null;
  }

  private mapStatus(rawStatus?: string): TransactionStatus | null {
    const status = Number(rawStatus);
    if ([3, 4].includes(status)) return TransactionStatus.PAID;
    if ([6, 7, 8].includes(status)) return TransactionStatus.CANCELED;
    return null;
  }

  private extractXmlTag(
    xml: string,
    tagName: string,
    parentTag?: string,
  ): string | undefined {
    const source = parentTag
      ? xml.match(new RegExp(`<${parentTag}>[\\s\\S]*?</${parentTag}>`, 'i'))?.[0]
      : xml;

    if (!source) return undefined;

    const match = source.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i'));
    return match?.[1]?.trim();
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
