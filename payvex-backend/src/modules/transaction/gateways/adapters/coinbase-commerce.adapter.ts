/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class CoinbaseCommerceAdapter implements PaymentGateway {
  private readonly baseUrl = 'https://api.commerce.coinbase.com';
  private readonly apiVersion = '2018-03-22';

  async createPayment(
    data: any,
    credentials: { apiKey?: string },
  ): Promise<PaymentResponse> {
    if (!credentials.apiKey) {
      throw new BadRequestException('API Key da Coinbase Commerce não configurada.');
    }

    try {
      const referenceId =
        data.payvexReference || data.orderId || `coinbase-${Date.now()}`;
      const response = await axios.post(
        `${this.baseUrl}/charges`,
        {
          name: data.itemName || `Pedido ${referenceId}`,
          description: data.description || `Pagamento Payvex ${referenceId}`,
          pricing_type: 'fixed_price',
          local_price: {
            amount: this.formatAmount(data.amount),
            currency: this.formatCurrency(data.currency || 'USD'),
          },
          metadata: {
            payvexReference: referenceId,
            filialId: data.filialId,
            cryptoCurrency: data.cryptoCurrency,
          },
          ...(data.successUrl || data.returnUrl
            ? { redirect_url: data.successUrl || data.returnUrl }
            : {}),
          ...(data.cancelUrl ? { cancel_url: data.cancelUrl } : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CC-Api-Key': credentials.apiKey,
            'X-CC-Version': this.apiVersion,
          },
        },
      );

      const charge = response.data?.data || response.data;
      return {
        externalId: String(charge?.id || charge?.code || referenceId),
        paymentUrl: charge?.hosted_url,
        status: 'PENDING',
        rawResponse: response.data,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento na Coinbase Commerce.';
      throw new BadRequestException(`[Coinbase Commerce Gateway Error]: ${message}`);
    }
  }

  private formatAmount(amount: number): string {
    return Number(amount || 0).toFixed(2);
  }

  private formatCurrency(currency: string): string {
    return String(currency || 'USD').toUpperCase();
  }
}
