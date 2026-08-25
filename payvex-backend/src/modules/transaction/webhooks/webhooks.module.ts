import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { IdentityModule } from 'src/modules/identity/module/identity.module';
import { WebhookProcessor } from './webhook.processor'; // Importamos o Processor para registrar como provider
import { AsaasPaymentsWebhookController } from './asaas-payments.controller';
import { CieloWebhooksController } from './cielo.controller';
import { CoinbaseCommerceWebhooksController } from './coinbase-commerce.controller';
import { BitPayWebhooksController } from './bitpay.controller';
import { MercadoPagoWebhooksController } from './mercado-pago.controller';
import { NowPaymentsWebhooksController } from './now-payments.controller';
import { NuvemShopWebhooksController } from './nuvem-shop.controller';
import { PagBankWebhooksController } from './pag-bank.controller';
import { PagarMeWebhooksController } from './pagar-me.controller';
import { PagSeguroWebhooksController } from './pagseguro.controller';
import { PicPayWebhooksController } from './picpay.controller';
import { ShopifyWebhooksController } from './shopify.controller';
import { StoneWebhooksController } from './stone.controller';
import { WebhookService } from './webhook.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    IdentityModule,
    // Registramos a fila específica para os eventos da Stripe
    BullModule.registerQueue({
      name: 'stripe-webhooks',
    }),
  ],
  controllers: [
    WebhooksController,
    MercadoPagoWebhooksController,
    AsaasPaymentsWebhookController,
    PagarMeWebhooksController,
    PagBankWebhooksController,
    CieloWebhooksController,
    NowPaymentsWebhooksController,
    CoinbaseCommerceWebhooksController,
    BitPayWebhooksController,
    ShopifyWebhooksController,
    NuvemShopWebhooksController,
    StoneWebhooksController,
    PagSeguroWebhooksController,
    PicPayWebhooksController,
  ],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService], // O Processor entra como provider
})
export class WebhookModule {}
