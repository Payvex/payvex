/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { UpgradeSubscriptionService } from '../services/upgradeSubscription.service';

@Controller('webhooks')
export class AsaasWebhookController {
  private readonly logger = new Logger(AsaasWebhookController.name);

  constructor(private readonly upgradeService: UpgradeSubscriptionService) {}

  @Post('asaas')
  @HttpCode(HttpStatus.OK) // O Asaas exige retorno 200
  async handleAsaasWebhook(@Body() body: any) {
    this.logger.log(`Evento recebido do Asaas: ${body.event}`);

    // Verificamos se o pagamento foi confirmado ou recebido
    if (
      body.event === 'PAYMENT_CONFIRMED' ||
      body.event === 'PAYMENT_RECEIVED'
    ) {
      const payment = body.payment;

      // Recuperamos o CompanyID e PlanKey que enviamos no externalReference
      // Lembra que salvamos como "id:PLAN" lá no Service?
      if (payment.externalReference) {
        const [companyId, planKey] = payment.externalReference.split(':');

        this.logger.log(
          `💰 Pagamento aprovado! Atualizando empresa ${companyId} para o plano ${planKey}`,
        );

        try {
          await this.upgradeService.upgradePlan(companyId, planKey);
          this.logger.log('✅ Banco de dados atualizado com sucesso!');
        } catch (error) {
          this.logger.error(`❌ Erro ao atualizar banco: ${error.message}`);
        }
      }
    }

    return { received: true };
  }
}
