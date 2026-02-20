/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PAYVEX_PLANS } from '../interfaces/subscriptions.interface';
import { AsaasService } from '../services/asaas.service'; // Novo Serviço

@Controller('subscription')
export class UpgradeSubscriptionController {
  constructor(
    private readonly asaasService: AsaasService, // Agora chamamos o Asaas
  ) {}

  @Post('checkout') // Mudamos o nome para checkout, pois gera pagamento
  @UseGuards(JwtAuthGuard)
  async checkout(@Request() req, @Body('planKey') planKey: string) {
    const companyId = req.user?.companyId;

    // Log para depuração: verifique se o planKey chega como "STANDARD", "PRO", etc.
    console.log('Recebendo checkout para:', { companyId, planKey });

    if (!companyId) {
      throw new BadRequestException('Empresa não identificada no token.');
    }

    // 1. Validamos o plano
    const plan = PAYVEX_PLANS[planKey as keyof typeof PAYVEX_PLANS];
    if (!plan) {
      throw new BadRequestException('Plano inválido.');
    }

    try {
      // 2. Criamos a assinatura no Asaas
      // O externalReference leva o companyId e o planKey para o Webhook saber o que liberar depois
      const asaasPayment = await this.asaasService.createSubscription({
        companyId: companyId,
        planKey: planKey,
        price: plan.price,
        planName: plan.name,
      });
      console.log('Resposta do Asaas:', asaasPayment); // Log para depuração;
      // 3. Retornamos o link para o Frontend abrir o checkout
      return {
        message: `Checkout gerado para o plano ${plan.name}`,
        checkoutUrl: asaasPayment.invoiceUrl, // Link do Asaas (Boleto/Cartão/Pix)
        billingId: asaasPayment.id,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
