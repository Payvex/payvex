/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { createHmac, randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  private readonly eventMap: Record<TransactionStatus, string> = {
    PENDING: 'payment.pending',
    PAID: 'payment.approved',
    FAILED: 'payment.failed',
    EXPIRED: 'payment.expired',
    CANCELED: 'payment.canceled',
  };

  private generateSignature(payload: string, timestamp: string, secret: string) {
    return createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
  }

  private resolveEvent(status: TransactionStatus) {
    return this.eventMap[status] || 'payment.updated';
  }

  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

  async sendWebhook(transactionId: string) {
    // 1. Busca a transação
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        filial: {
          include: { apiKeys: { where: { isActive: true }, take: 1 } },
        },
      },
    });

    // 🛡️ CORREÇÃO: Verifica se a transação existe antes de prosseguir
    if (!tx) {
      this.logger.error(
        `Webhook falhou: Transação ${transactionId} não encontrada no banco.`,
      );
      return;
    }

    // Agora o TS sabe que 'tx' não é null
    const apiKey = tx.filial.apiKeys[0];

    // 2. Se não houver chave ou URL, cancela o envio
    if (!apiKey || !apiKey.webhookUrl) {
      this.logger.warn(
        `Webhook ignorado: Filial ${tx.filialId} não possui URL de Webhook configurada.`,
      );
      return;
    }

    const event = this.resolveEvent(tx.status);

    // 3. Monta o Payload
    const payload = {
      event,
      data: {
        id: tx.id,
        externalId: tx.externalId,
        amount: Number(tx.amount),
        netAmount: Number(tx.netAmount),
        status: tx.status,
        customerName: tx.customerName,
        customerEmail: tx.customerEmail,
        paidAt: tx.updatedAt.toISOString(),
        metadata: tx.metadata,
      },
    };

    const rawPayload = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const deliveryId = randomUUID();
    const signature = this.generateSignature(
      rawPayload,
      timestamp,
      apiKey.webhookSecret,
    );

    try {
      this.logger.log(
        `Iniciando disparo de Webhook para: ${apiKey.webhookUrl}`,
      );

      await firstValueFrom(
        this.httpService.post(apiKey.webhookUrl, payload, {
          headers: {
            'X-Payvex-Signature': `sha256=${signature}`,
            'X-Payvex-Timestamp': timestamp,
            'X-Payvex-Event': event,
            'X-Payvex-Delivery': deliveryId,
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }),
      );

      this.logger.log(
        `✅ Webhook entregue com sucesso: TX ${tx.id} | Delivery ${deliveryId}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro ao entregar Webhook para ${apiKey.webhookUrl}: ${error.message}`,
      );
    }
  }
}
