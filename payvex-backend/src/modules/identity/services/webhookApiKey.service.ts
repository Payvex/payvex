/* eslint-disable @typescript-eslint/no-unsafe-member-access */

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

  private generateSignature(
    payload: string,
    timestamp: string,
    secret: string,
  ) {
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
      include: { filial: true },
    });

    // 🛡️ CORREÇÃO: Verifica se a transação existe antes de prosseguir
    if (!tx) {
      this.logger.error(
        `Webhook falhou: Transação ${transactionId} não encontrada no banco.`,
      );
      return;
    }

    const metadata = (tx.metadata as Record<string, any>) || {};
    const apiKey = await this.prisma.apiKey.findFirst({
      where: {
        filialId: tx.filialId,
        isActive: true,
        ...(metadata.apiKeyId ? { id: String(metadata.apiKeyId) } : {}),
      },
    });

    const fallbackApiKey =
      apiKey ||
      (await this.prisma.apiKey.findFirst({
        where: { filialId: tx.filialId, isActive: true },
        orderBy: { createdAt: 'asc' },
      }));

    // 2. Se não houver chave ou URL, cancela o envio
    if (!fallbackApiKey || !fallbackApiKey.webhookUrl) {
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
      fallbackApiKey.webhookSecret,
    );

    const headers = {
      'X-Payvex-Signature': `sha256=${signature}`,
      'X-Payvex-Timestamp': timestamp,
      'X-Payvex-Event': event,
      'X-Payvex-Delivery': deliveryId,
      'Content-Type': 'application/json',
    };

    // --- 4. LOG DE AUDITORIA (NOVO) ---
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: 'PAYVEX_OUTGOING',
        eventType: event,
        filialId: tx.filialId,
        apiKeyId: fallbackApiKey.id,
        externalId: tx.externalId,
        payload: payload as any,
        headers: headers as any,
        status: 'PENDING',
      },
    });

    try {
      this.logger.log(
        `Iniciando disparo de Webhook para: ${fallbackApiKey.webhookUrl}`,
      );

      const response = await firstValueFrom(
        this.httpService.post(fallbackApiKey.webhookUrl, payload, {
          headers,
          timeout: 7000,
        }),
      );

      // Atualiza log com sucesso
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          statusCode: response.status,
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `✅ Webhook entregue com sucesso: TX ${tx.id} | Delivery ${deliveryId}`,
      );
    } catch (error: any) {
      // Atualiza log com falha
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          statusCode: error.response?.status || 500,
          errorMessage: error.message,
          processedAt: new Date(),
        },
      });

      this.logger.error(
        `❌ Erro ao entregar Webhook para ${fallbackApiKey.webhookUrl}: ${error.message}`,
      );
    }
  }
}
