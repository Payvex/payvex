import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('StripeWebhookProducer');

  constructor(@InjectQueue('stripe-webhooks') private webhookQueue: Queue) {}

  async processStripe(rawBody: Buffer, signature: string) {
    const job = await this.webhookQueue.add(
      'process-webhook',
      {
        rawBody: rawBody.toString('base64'),
        signature,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    this.logger.log(`📥 Evento encaminhado para a fila. Job: ${job.id}`);
    return { received: true, jobId: job.id };
  }
}
