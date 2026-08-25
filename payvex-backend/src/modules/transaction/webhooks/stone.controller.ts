/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Controller('webhooks')
export class StoneWebhooksController {
  private readonly logger = new Logger(StoneWebhooksController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {}

  @Post('stone')
  @HttpCode(HttpStatus.OK)
  async handleStoneWebhook(@Body() body: any) {
    const charge = body?.data || body?.charge || body;
    const chargeId = charge?.id;
    const initiatorId = charge?.initiator_id;
    const referenceId = charge?.reference_id;

    if (!chargeId && !initiatorId && !referenceId) {
      this.logger.warn('Webhook Stone ignorado: payload sem identificador.');
      return { received: true, ignored: true };
    }

    const transaction = await this.findTransaction(chargeId, initiatorId, referenceId);
    if (!transaction) {
      this.logger.warn(
        `Webhook Stone ignorado: transação não encontrada para ${chargeId || initiatorId || referenceId}.`,
      );
      return { received: true, ignored: true };
    }

    const status = this.mapStatus(charge?.status, charge?.card_transaction?.result);
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        ...(status ? { status } : {}),
        metadata: {
          ...((transaction.metadata as Record<string, any>) || {}),
          stoneChargeId: chargeId,
          stoneInitiatorId: initiatorId,
          stoneReferenceId: referenceId,
          stoneStatus: charge?.status,
          stoneLastPayload: body,
        },
      },
    });

    if (status) {
      await this.sendPayvexWebhook(transaction.id);
    }

    return { received: true, status: status || 'NO_CHANGE' };
  }

  private async findTransaction(
    chargeId?: string,
    initiatorId?: string,
    referenceId?: string,
  ) {
    for (const value of [chargeId, initiatorId, referenceId]) {
      if (!value) continue;

      const byExternalId = await this.prisma.transaction.findFirst({
        where: { externalId: String(value) },
        select: { id: true, metadata: true },
      });
      if (byExternalId) return byExternalId;

      const byPayvexReference = await this.prisma.transaction.findFirst({
        where: { metadata: { path: ['payvexReference'], equals: String(value) } },
        select: { id: true, metadata: true },
      });
      if (byPayvexReference) return byPayvexReference;
    }

    return null;
  }

  private mapStatus(
    rawStatus?: string,
    transactionResult?: string,
  ): TransactionStatus | null {
    const status = String(rawStatus || '').toLowerCase();
    const result = String(transactionResult || '').toLowerCase();

    if (status === 'paid') return TransactionStatus.PAID;
    if (status === 'canceled') return TransactionStatus.CANCELED;
    if (status === 'declined' || result === 'failed') return TransactionStatus.FAILED;
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
