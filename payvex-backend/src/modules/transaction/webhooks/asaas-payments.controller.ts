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
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';

@Controller('webhooks/asaas')
export class AsaasPaymentsWebhookController {
  private readonly logger = new Logger(AsaasPaymentsWebhookController.name);
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('payments')
  @HttpCode(HttpStatus.OK)
  async handlePaymentWebhook(
    @Body() body: any,
    @Headers('asaas-access-token') dashHeader?: string,
    @Headers('asaas_access_token') underscoreHeader?: string,
  ) {
    const event = body?.event as string | undefined;
    const paymentId = body?.payment?.id as string | undefined;
    const externalReference = body?.payment?.externalReference as
      | string
      | undefined;

    if (!event || !paymentId) {
      this.logger.warn('Evento Asaas ignorado: payload sem event/payment.id.');
      return { received: true, ignored: true };
    }

    const transaction = await this.findTransaction(paymentId, externalReference);

    if (!transaction) {
      this.logger.warn(
        `Evento ${event} ignorado: transação ${paymentId} não encontrada.`,
      );
      return { received: true, ignored: true };
    }

    this.validateWebhookToken(
      transaction.filial.asaasWebhookToken,
      dashHeader || underscoreHeader,
    );

    const status = this.mapEventToStatus(event);
    if (!status) {
      this.logger.log(`Evento Asaas ${event} recebido sem mudança de status.`);
      return { received: true, event };
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status,
        externalId: paymentId,
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          asaasLastEvent: event,
          asaasPaymentId: paymentId,
          asaasExternalReference: externalReference,
          asaasLastPayload: body,
        },
      },
    });

    try {
      await this.apiKeyWebhookService.sendWebhook(transaction.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Falha ao disparar webhook Payvex: ${message}`);
    }

    this.logger.log(`Transação Asaas ${paymentId} atualizada para ${status}.`);
    return { received: true, event, status };
  }

  private validateWebhookToken(
    encryptedToken?: string | null,
    receivedToken?: string,
  ) {
    if (!encryptedToken) {
      this.logger.warn(
        'asaasWebhookToken não configurado na filial; evento aceito sem validação.',
      );
      return;
    }

    if (!this.MASTER_KEY) {
      throw new Error('Missing encryption key');
    }

    const expectedToken = decryptWithKey(encryptedToken, this.MASTER_KEY);
    if (!receivedToken || receivedToken !== expectedToken) {
      throw new UnauthorizedException('Invalid Asaas webhook token');
    }
  }

  private mapEventToStatus(event: string): TransactionStatus | null {
    const paidEvents = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']);
    const expiredEvents = new Set([
      'PAYMENT_OVERDUE',
      'PAYMENT_BANK_SLIP_CANCELLED',
    ]);
    const failedEvents = new Set([
      'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
      'PAYMENT_REFUND_DENIED',
    ]);
    const canceledEvents = new Set([
      'PAYMENT_DELETED',
      'PAYMENT_REFUNDED',
      'PAYMENT_PARTIALLY_REFUNDED',
      'PAYMENT_REFUND_IN_PROGRESS',
      'PAYMENT_RECEIVED_IN_CASH_UNDONE',
      'PAYMENT_CHARGEBACK_REQUESTED',
    ]);

    if (paidEvents.has(event)) return TransactionStatus.PAID;
    if (expiredEvents.has(event)) return TransactionStatus.EXPIRED;
    if (failedEvents.has(event)) return TransactionStatus.FAILED;
    if (canceledEvents.has(event)) return TransactionStatus.CANCELED;
    return null;
  }

  private async findTransaction(
    paymentId: string,
    externalReference?: string,
  ) {
    const byPaymentId = await this.prisma.transaction.findUnique({
      where: { externalId: paymentId },
      include: { filial: true },
    });
    if (byPaymentId) return byPaymentId;

    if (externalReference) {
      return this.prisma.transaction.findFirst({
        where: {
          metadata: { path: ['payvexReference'], equals: externalReference },
        },
        include: { filial: true },
      });
    }

    return null;
  }
}
