import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service/prisma.service';
import { AsaasWebhookController } from '../controllers/asaas.webhook.controller';
import { MySubscriptionController } from '../controllers/subscriptionMe.controller';
import { PlansController } from '../controllers/subscriptionPlans.controller';
import { UpgradeSubscriptionController } from '../controllers/subscriptionUpgrade.controller';
import { AsaasService } from '../services/asaas.service';
import { SubscriptionService } from '../services/subscription.service';
import { UpgradeSubscriptionService } from '../services/upgradeSubscription.service';

@Module({
  controllers: [
    PlansController, // Rota: /plans (Pública/Catálogo)
    MySubscriptionController, // Rota: /my-subscription (Privada/Status)
    UpgradeSubscriptionController,
    AsaasWebhookController, // Rota: /webhooks/asaas (Privada/Recebe Webhook do Asaas)
  ],
  providers: [
    SubscriptionService,
    PrismaService,
    AsaasService,
    UpgradeSubscriptionService,
  ],
  exports: [SubscriptionService], // Exportamos para que outros módulos (ex: Filial ou IA) consultem limites
})
export class SubscriptionModule {}
