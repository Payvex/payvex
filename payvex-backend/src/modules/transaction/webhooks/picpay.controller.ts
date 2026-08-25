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
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import axios from 'axios';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class PicPayWebhooksController {
  private readonly logger = new Logger(PicPayWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;
  private readonly baseUrl = 'https://api.picpay.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('picpay')
  @HttpCode(HttpStatus.OK)
  async handlePicPayWebhook(
    @Body() body: any,
    @Query('filialId') filialId?: string,
    @Headers('x-seller-token') sellerToken?: string,
  ) {
    const referenceId =
      body?.referenceId ||
      body?.reference_id ||
      body?.merchantChargeId ||
      body?.data?.referenceId ||
      body?.data?.reference_id;

    if (!referenceId) {
      this.logger.warn('Webhook PicPay ignorado: payload sem referenceId.');
      return { received: true, ignored: true };
    }

    const transaction = await this.findTransaction(String(referenceId), filialId);
    if (!transaction) {
      this.logger.warn(
        `Webhook PicPay ignorado: transação ${referenceId} não encontrada.`,
      );
      return { received: true, ignored: true };
    }

    this.validateSellerToken(transaction.filial, sellerToken);

    const statusPayload = await this.fetchStatus(
      String(referenceId),
      transaction.filial,
    );
    const status = this.mapStatus(
      statusPayload?.status || body?.status || body?.data?.status,
    );

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          picPayReferenceId: referenceId,
          picPayStatus: statusPayload?.status || body?.status,
          picPayLastPayload: body,
          picPayStatusPayload: statusPayload,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async findTransaction(referenceId: string, filialId?: string) {
    const baseWhere = filialId ? { filialId } : {};

    const byExternalId = await this.prisma.transaction.findFirst({
      where: { ...baseWhere, externalId: referenceId },
      include: { filial: true },
    });
    if (byExternalId) return byExternalId;

    return this.prisma.transaction.findFirst({
      where: {
        ...baseWhere,
        metadata: { path: ['payvexReference'], equals: referenceId },
      },
      include: { filial: true },
    });
  }

  private validateSellerToken(filial: any, receivedToken?: string) {
    if (!filial.picPaySellerToken) {
      this.logger.warn(
        'picPaySellerToken não configurado; callback PicPay aceito sem validação.',
      );
      return;
    }

    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const expectedToken = decryptWithKey(
      filial.picPaySellerToken,
      this.MASTER_KEY,
    );
    if (!receivedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('x-seller-token PicPay inválido.');
    }
  }

  private async fetchStatus(referenceId: string, filial: any) {
    const headers = await this.buildHeaders(filial);
    const response = await axios.get(
      `${this.baseUrl}/ecommerce/v2/payments/${encodeURIComponent(
        referenceId,
      )}/status`,
      { headers },
    );

    return response.data;
  }

  private async buildHeaders(filial: any) {
    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (filial.picPayClientId && filial.picPayClientSecret) {
      const clientId = decryptWithKey(filial.picPayClientId, this.MASTER_KEY);
      const clientSecret = decryptWithKey(
        filial.picPayClientSecret,
        this.MASTER_KEY,
      );
      const response = await axios.post(
        `${this.baseUrl}/oauth2/token`,
        {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        },
      );
      headers.Authorization = `Bearer ${response.data?.access_token}`;
      return headers;
    }

    if (filial.picPayPublicKey) {
      headers['x-picpay-token'] = decryptWithKey(
        filial.picPayPublicKey,
        this.MASTER_KEY,
      );
      return headers;
    }

    throw new Error('Filial sem credenciais PicPay.');
  }

  private mapStatus(rawStatus?: string): TransactionStatus | null {
    const status = String(rawStatus || '').toLowerCase();
    if (['paid', 'completed', 'approved'].includes(status)) {
      return TransactionStatus.PAID;
    }
    if (status === 'expired') return TransactionStatus.EXPIRED;
    if (['cancelled', 'canceled', 'refunded', 'chargeback'].includes(status)) {
      return TransactionStatus.CANCELED;
    }
    if (['analysis', 'created'].includes(status)) return TransactionStatus.PENDING;
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
