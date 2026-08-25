/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import Stripe from 'stripe';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class StripeAdapter implements PaymentGateway {
  async createPayment(
    data: any,
    credentials: { secretKey: string },
  ): Promise<PaymentResponse> {
    const stripe = new Stripe(credentials.secretKey, {
      apiVersion: '2025-12-15.clover' as any,
    });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: this.mapPaymentMethod(data.paymentMethod),

        // 🛡️ O PULO DO GATO PARA O PIX:
        // O Stripe exige a coleta do endereço e CPF para validar o PIX no Brasil.
        // Sem isso, ele retorna o erro de "invalid payment method type: pix".
        billing_address_collection: 'required',

        line_items: [
          {
            price_data: {
              currency: 'brl', // O PIX só funciona com BRL
              product_data: {
                name: `Cobrança Payvex - ${data.customerName || 'Venda Online'}`,
              },
              unit_amount: Math.round(data.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url:
          process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/success',
        cancel_url:
          process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/integrations',

        customer_email: data.customerEmail,

        // Configurações adicionais para garantir a compatibilidade
        payment_method_options: {
          pix: {
            expires_after_seconds: 3600, // Expira em 1 hora
          },
        },

        metadata: {
          filialId: data.filialId,
        },
        payment_intent_data: {
          metadata: {
            filialId: data.filialId,
          },
        },
      });

      return {
        externalId: session.id,
        paymentUrl: session.url ?? undefined,
        rawResponse: session,
      };
    } catch (error) {
      throw new Error(`[Stripe Gateway Error]: ${error.message}`);
    }
  }

  private mapPaymentMethod(
    method: string,
  ): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
    const methods: Record<
      string,
      Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
    > = {
      CREDIT_CARD: ['card'],
      PIX: ['pix'], // Certifique-se que o valor vindo do front é "PIX"
      BOLETO: ['boleto'],
    };

    return methods[method] || ['card'];
  }
}
