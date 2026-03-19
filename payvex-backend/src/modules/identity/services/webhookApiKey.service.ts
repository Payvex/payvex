/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service/prisma.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

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

    // 3. Monta o Payload
    const payload = {
      event: 'payment.approved',
      data: {
        id: tx.id,
        externalId: tx.externalId,
        amount: Number(tx.amount),
        netAmount: Number(tx.netAmount),
        status: tx.status,
        customerName: tx.customerName,
        customerEmail: tx.customerEmail,
        paidAt: tx.updatedAt,
      },
    };

    try {
      this.logger.log(
        `Iniciando disparo de Webhook para: ${apiKey.webhookUrl}`,
      );

      await firstValueFrom(
        this.httpService.post(apiKey.webhookUrl, payload, {
          headers: {
            'X-Payvex-Signature': 'sha256_hash_aqui', // Dica: Implementaremos isso depois
            'Content-Type': 'application/json',
          },
          timeout: 7000,
        }),
      );

      this.logger.log(`✅ Webhook entregue com sucesso: TX ${tx.id}`);
    } catch (error) {
      this.logger.error(
        `❌ Erro ao entregar Webhook para ${apiKey.webhookUrl}: ${error.message}`,
      );
    }
  }
}
