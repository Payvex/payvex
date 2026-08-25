/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type { Request, Response } from 'express';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks')
export class MercadoPagoWebhooksController {
  private readonly logger = new Logger(MercadoPagoWebhooksController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('mercadopago')
  async handleMercadoPago(@Req() req: Request, @Res() res: Response) {
    const event = req.body || {};
    const topic = event?.type || event?.topic;
    const dataId = this.resolveDataId(req);
    const filialId = this.resolveQueryValue(req.query.filialId);

    if (!topic || !dataId) {
      return res.sendStatus(200);
    }

    try {
      if (topic === 'payment' || topic === 'payment.created') {
        await this.upsertPaymentFromPaymentId(String(dataId), filialId, req);
      }

      return res.sendStatus(200);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return res.sendStatus(401);
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Erro ao processar webhook Mercado Pago: ${message}`);
      return res.sendStatus(200);
    }
  }

  private resolveDataId(req: Request): string | undefined {
    const queryDataId =
      this.resolveQueryValue(req.query['data.id']) ||
      this.resolveQueryValue(req.query.data_id);
    return queryDataId || req.body?.data?.id || req.body?.id;
  }

  private resolveQueryValue(value: unknown): string | undefined {
    if (Array.isArray(value)) return String(value[0]);
    if (value === undefined || value === null) return undefined;
    return String(value);
  }

  private async resolveFilialByExternalId(externalId: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { externalId },
      select: { filialId: true },
    });
    return tx?.filialId ?? null;
  }

  private async findFilialForPayment(paymentId: string, filialId?: string) {
    if (filialId) return filialId;

    const known = await this.resolveFilialByExternalId(paymentId);
    if (known) return known;

    const candidate = await this.prisma.transaction.findFirst({
      where: { metadata: { path: ['paymentId'], equals: paymentId } },
      select: { filialId: true },
    });
    return candidate?.filialId ?? null;
  }

  private async resolveCredentials(filialId: string) {
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialId },
      select: {
        mercadoPagoAccessToken: true,
        mercadoPagoWebhookSecret: true,
      },
    });
    if (!filial?.mercadoPagoAccessToken) {
      throw new Error('Filial sem token Mercado Pago.');
    }

    if (!this.MASTER_KEY) {
      throw new Error('ENCRYPTION_KEY ausente.');
    }

    return {
      accessToken: decryptWithKey(
        filial.mercadoPagoAccessToken,
        this.MASTER_KEY,
      ),
      webhookSecret: filial.mercadoPagoWebhookSecret
        ? decryptWithKey(filial.mercadoPagoWebhookSecret, this.MASTER_KEY)
        : undefined,
    };
  }

  private async fetchPayment(paymentId: string, accessToken: string) {
    const url = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    try {
      const data = await response.text();
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private normalizePaymentStatus(status?: string): string | null {
    const s = String(status || '').toUpperCase();
    if (!s) return null;
    if (['APPROVED', 'PAID', 'CAPTURED'].includes(s)) return 'PAID';
    if (['PENDING', 'IN_PROCESS', 'PENDING_PAYMENT', 'REVIEWING'].includes(s))
      return 'PENDING';
    if (['REJECTED', 'FAILED'].includes(s)) return 'FAILED';
    if (['EXPIRED', 'CANCELED', 'CANCELLED', 'CHARGED_BACK'].includes(s))
      return 'CANCELED';
    return null;
  }

  private toTransactionStatus(status: string): TransactionStatus {
    switch (status) {
      case 'PAID':
        return TransactionStatus.PAID;
      case 'FAILED':
        return TransactionStatus.FAILED;
      case 'CANCELED':
        return TransactionStatus.CANCELED;
      case 'EXPIRED':
        return TransactionStatus.EXPIRED;
      default:
        return TransactionStatus.PENDING;
    }
  }

  private async upsertPaymentFromPaymentId(
    paymentId: string,
    filialIdFromUrl: string | undefined,
    req: Request,
  ) {
    const existing = await this.prisma.transaction.findFirst({
      where: { externalId: paymentId },
      select: { id: true, filialId: true, paymentUrl: true, metadata: true },
    });

    const filialId =
      existing?.filialId ||
      (await this.findFilialForPayment(paymentId, filialIdFromUrl));

    if (!filialId) return;

    const { accessToken, webhookSecret } =
      await this.resolveCredentials(filialId);
    this.validateSignature(req, paymentId, webhookSecret);

    const payment = await this.fetchPayment(paymentId, accessToken);

    if (!payment) return;

    const status = this.normalizePaymentStatus((payment as any).status);
    if (!status) return;

    const transactionStatus = this.toTransactionStatus(status);
    const qrCode =
      (payment as any)?.point_of_interaction?.transaction_data?.qr_code ||
      (payment as any)?.qr_code ||
      undefined;
    const qrCodeImage =
      (payment as any)?.point_of_interaction?.transaction_data?.qr_code_image ||
      (payment as any)?.qr_code_image ||
      undefined;

    const payvexReference = (payment as any).external_reference || undefined;

    const transaction =
      existing ||
      (payvexReference
        ? await this.prisma.transaction.findFirst({
            where: {
              metadata: { path: ['payvexReference'], equals: payvexReference },
            },
            select: {
              id: true,
              filialId: true,
              paymentUrl: true,
              metadata: true,
            },
          })
        : null);

    const baseMetadata: Record<string, any> =
      (transaction?.metadata as Record<string, any>) || {};

    if (transaction) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: transactionStatus,
          pixQrCode: qrCode || undefined,
          paymentUrl: qrCodeImage || transaction.paymentUrl,
          metadata: {
            ...baseMetadata,
            paymentId,
            payvexReference,
            mercadopagoStatus: (payment as any).status,
            mercadopagoRaw: payment,
          },
        },
      });

      await this.sendPayvexWebhook(transaction.id);
    } else {
      const created = await this.prisma.transaction.create({
        data: {
          amount: Number((payment as any).transaction_amount || 0),
          currency: (payment as any).currency_id || 'BRL',
          paymentMethod: this.mapPaymentMethod(
            (payment as any).payment_method_id,
          ),
          gateway: 'MERCADO_PAGO',
          externalId: paymentId,
          filialId,
          status: transactionStatus,
          pixQrCode: qrCode || undefined,
          paymentUrl: qrCodeImage,
          customerEmail: (payment as any)?.payer?.email || undefined,
          customerName:
            [
              (payment as any)?.payer?.first_name,
              (payment as any)?.payer?.last_name,
            ]
              .filter(Boolean)
              .join(' ') || undefined,
          customerDocument:
            (payment as any)?.payer?.identification?.number || undefined,
          metadata: {
            paymentId,
            payvexReference,
            mercadopagoStatus: (payment as any).status,
            mercadopagoRaw: payment,
          },
        },
      });

      await this.sendPayvexWebhook(created.id);
    }
  }

  private validateSignature(
    req: Request,
    dataId: string,
    secret?: string,
  ): void {
    if (!secret) {
      this.logger.warn(
        'mercadoPagoWebhookSecret não configurado; evento aceito sem validação.',
      );
      return;
    }

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (typeof xSignature !== 'string' || typeof xRequestId !== 'string') {
      throw new UnauthorizedException('Mercado Pago signature missing');
    }

    const parts = Object.fromEntries(
      xSignature.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key?.trim(), value?.trim()];
      }),
    );

    const ts = parts.ts;
    const signature = parts.v1;
    if (!ts || !signature) {
      throw new UnauthorizedException('Mercado Pago signature malformed');
    }

    const signedTemplate = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', secret)
      .update(signedTemplate)
      .digest('hex');

    const receivedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Mercado Pago signature invalid');
    }
  }

  private async sendPayvexWebhook(transactionId: string) {
    try {
      await this.apiKeyWebhookService.sendWebhook(transactionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao disparar webhook Payvex: ${message}`);
    }
  }

  private mapPaymentMethod(paymentMethodId?: string) {
    const method = String(paymentMethodId || '').toLowerCase();
    if (method.includes('pix')) return 'PIX';
    if (method.includes('ticket') || method.includes('boleto')) return 'BOLETO';
    if (method.includes('credit') || method.includes('debit'))
      return 'CREDIT_CARD';
    return 'PIX';
  }
}
