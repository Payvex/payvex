/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
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

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`🚚 Job ${job.id} iniciado.`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`✅ Job ${job.id} concluído.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `❌ Job ${job?.id ?? 'desconhecido'} falhou: ${error.message}`,
    );
  }

  /**
   * ⚙️ EXECUÇÃO DO JOB
   * O BullMQ chama este método automaticamente para cada item na fila.
   */
  async process(
    job: Job<{ rawBody: string; signature: string }>,
  ): Promise<any> {
    const { rawBody, signature } = job.data;
    return this.processPayload(Buffer.from(rawBody, 'base64'), signature, job.id);
  }

  async processPayload(
    bodyBuffer: Buffer,
    signature: string,
    jobId: string | number = 'direct',
  ): Promise<any> {
    const payload = bodyBuffer.toString('utf8');

    if (!this.MASTER_KEY) {
      this.logger.error('❌ [CRÍTICO] MASTER_KEY não encontrada no ambiente.');
      throw new Error('Missing encryption key'); // BullMQ tentará novamente
    }

    // 1. Identificação Prévia da Filial (precisamos saber de quem é a chave)
    const eventData = JSON.parse(payload);
    const stripeObject = eventData.data?.object;
    const filialId = stripeObject?.metadata?.filialId;

    if (!filialId) {
      this.logger.error(
        `⚠️ [ALERTA] Evento ${eventData.type} ignorado: metadata filialId ausente no job ${jobId}`,
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
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `❌ [ASSINATURA] Falha no Job ${jobId}: ${message}`,
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `❌ Erro ao processar dados financeiros: ${message}`,
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Erro no banco de dados: ${message}`);
      throw error; // Força o BullMQ a retentar o job
    }
  }
}
