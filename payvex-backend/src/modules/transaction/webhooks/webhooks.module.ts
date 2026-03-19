/* eslint-disable prettier/prettier */
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { WebhookProcessor } from './webhook.processor'; // Importamos o Processor para registrar como provider
import { WebhookService } from './webhook.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    // Registramos a fila específica para os eventos da Stripe
    BullModule.registerQueue({
      name: 'stripe-webhooks',
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhookService, WebhookProcessor, PrismaService],
  exports: [WebhookService], // O Processor entra como provider
})
export class WebhookModule {}
