/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { WebhookService as ApiKeyWebhookService } from 'src/modules/identity/services/webhookApiKey.service';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { decryptWithKey } from 'src/utils/security.util';
import Stripe from 'stripe';

@Processor('stripe-webhooks')
@Injectable()
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger('StripeProcessor');
  private readonly MASTER_KEY = process.env.ENCRYPTION_KEY;

  constructor(
    private prisma: PrismaService,
    private readonly apiKeyWebhookService: ApiKeyWebhookService,
  ) {
    super();
  }

  /**
   * ⚙️ EXECUÇÃO DO JOB
   * O BullMQ chama este método automaticamente para cada item na fila.
   */
  async process(
    job: Job<{ rawBody: string; signature: string }>,
  ): Promise<any> {
    const { rawBody, signature } = job.data;
    const bodyBuffer = Buffer.from(rawBody);

    if (!this.MASTER_KEY) {
      this.logger.error('❌ [CRÍTICO] MASTER_KEY não encontrada no ambiente.');
      throw new Error('Missing encryption key'); // BullMQ tentará novamente
    }

    // 1. Identificação Prévia da Filial (precisamos saber de quem é a chave)
    const eventData = JSON.parse(rawBody);
    const filialId = eventData.data.object.metadata?.filialId;

    if (!filialId) {
      this.logger.error(
        `⚠️ [ALERTA] Evento ignorado: metadata filialId ausente no job ${job.id}`,
      );
      return;
    }

    // 2. Busca e Descriptografia de Chaves
    const filial = await this.prisma.filial.findUnique({
      where: { id: filialId },
    });
    if (!filial?.stripeSecretKey || !filial?.stripeWebhookSecret) {
      this.logger.error(
        `❌ [ERRO] Filial ${filialId} sem chaves configuradas.`,
      );
      throw new Error('Keys not found');
    }

    const secretKey = decryptWithKey(filial.stripeSecretKey, this.MASTER_KEY);
    const webhookSecret = decryptWithKey(
      filial.stripeWebhookSecret,
      this.MASTER_KEY,
    );

    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover' as any,
    });

    // 3. Validação de Assinatura
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        bodyBuffer,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `❌ [ASSINATURA] Falha no Job ${job.id}: ${err.message}`,
      );
      return; // Erro de assinatura não deve ser retentado (a assinatura não mudará)
    }

    // 4. Orquestração de Handlers
    const session = event.data.object as Stripe.Checkout.Session;

    this.logger.log(
      `⚡ Processando evento ${event.type} para filial ${filialId}`,
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handlePaymentSucceeded(stripe, session);
        break;

      case 'checkout.session.expired':
        await this.updateTransactionStatus(session.id, 'EXPIRED');
        break;

      case 'payment_intent.payment_failed':
        await this.updateTransactionStatus(session.id, 'FAILED');
        break;

      default:
        this.logger.log(
          `ℹ️ Evento ${event.type} não possui handler específico.`,
        );
    }

    return { processed: true, eventId: event.id };
  }

  /**
   * 💰 HANDLER: Pagamento Bem Sucedido
   * Busca taxas e calcula o lucro líquido.
   */
  private async handlePaymentSucceeded(
    stripe: Stripe,
    session: Stripe.Checkout.Session,
  ) {
    try {
      // ⏳ Delay estratégico para a Stripe consolidar a transação de balanço
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent as string,
        { expand: ['latest_charge'] },
      );

      const charge = paymentIntent.latest_charge as Stripe.Charge;

      if (charge?.balance_transaction) {
        const bt = await stripe.balanceTransactions.retrieve(
          charge.balance_transaction as string,
        );

        const fee = bt.fee / 100;
        const netAmount = bt.net / 100;

        await this.updateTransactionStatus(session.id, 'PAID', fee, netAmount);
        this.logger.log(
          `📊 Financeiro atualizado: Fee R$ ${fee} | Net R$ ${netAmount}`,
        );
      } else {
        await this.updateTransactionStatus(session.id, 'PAID');
      }
    } catch (error) {
      this.logger.error(
        `❌ Erro ao processar dados financeiros: ${error.message}`,
      );
      // Marcamos como PAID mesmo se a taxa falhar, para não prejudicar o cliente
      await this.updateTransactionStatus(session.id, 'PAID');
    }
  }

  /**
   * 💾 PERSISTÊNCIA: Atualiza o Banco de Dados
   */
  private async updateTransactionStatus(
    externalId: string,
    status: TransactionStatus,
    fee?: number,
    netAmount?: number,
  ) {
    try {
      const updateData: any = { status, updatedAt: new Date() };
      if (fee !== undefined) updateData.fee = fee;
      if (netAmount !== undefined) updateData.netAmount = netAmount;

      const result = await this.prisma.transaction.updateMany({
        where: { externalId },
        data: updateData,
      });

      if (result.count > 0) {
        const transaction = await this.prisma.transaction.findFirst({
          where: { externalId },
          select: { id: true },
        });

        if (transaction) {
          await this.apiKeyWebhookService.sendWebhook(transaction.id);
        }

        this.logger.log(
          `💾 Transação ${externalId} atualizada para ${status}.`,
        );
      } else {
        this.logger.warn(`⚠️ Transação ${externalId} não encontrada no banco.`);
      }
    } catch (error) {
      this.logger.error(`❌ Erro no banco de dados: ${error.message}`);
      throw error; // Força o BullMQ a retentar o job
    }
  }
}
