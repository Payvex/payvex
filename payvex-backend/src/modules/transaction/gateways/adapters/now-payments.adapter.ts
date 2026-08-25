/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class NowPaymentsAdapter implements PaymentGateway {
  async createPayment(
    data: any,
    credentials: { apiKey?: string },
  ): Promise<PaymentResponse> {
    if (!credentials.apiKey) {
      throw new BadRequestException('API Key do NOWPayments não configurada.');
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': credentials.apiKey,
      };

      const paymentData = await this.createNowPayment(data, headers);

      return this.formatResponse(paymentData, data);
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento no NOWPayments.';
      throw new BadRequestException(`[NOWPayments Gateway Error]: ${message}`);
    }
  }

  private async createNowPayment(data: any, headers: any): Promise<any> {
    const cryptoCurrency = this.determineCryptoCurrency(
      data.cryptoCurrency,
    );
    const referenceId =
      data.payvexReference || data.orderId || data.orderHash || `order-${Date.now()}`;
    const callbackUrl = this.resolveCallbackUrl(data);

    const payload: Record<string, any> = {
      price_amount: this.formatAmount(data.amount, data.currency || 'USD'),
      price_currency: this.formatCurrency(data.currency || 'USD'),
      ...(cryptoCurrency ? { pay_currency: cryptoCurrency } : {}),
      order_id: referenceId,
      order_description: data.description || `Pagamento Payvex ${referenceId}`,
      ipn_callback_url: callbackUrl,
      ...(data.successUrl || data.returnUrl
        ? { success_url: data.successUrl || data.returnUrl }
        : {}),
      ...(data.cancelUrl && { cancel_url: data.cancelUrl }),
      ...(data.customerEmail && { email: data.customerEmail }),
    };

    const response = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      payload,
      { headers },
    );
    return response.data;
  }

  private formatResponse(paymentData: any, data: any): PaymentResponse {
    if (!paymentData) {
      return {
        externalId: data.payvexReference || `nowpayments-${Date.now()}`,
        status: 'PENDING',
        rawResponse: {},
      };
    }

    return {
      externalId: String(
        paymentData.id ||
          paymentData.invoice_id ||
          paymentData.payment_id ||
          data.payvexReference,
      ),
      paymentUrl:
        paymentData.invoice_url || paymentData.payment_url || undefined,
      pixQrCode: paymentData.qr_code || undefined,
      status: 'PENDING',
      rawResponse: paymentData,
    };
  }

  private formatAmount(amount: number, currency: string): number {
    return parseFloat(amount.toString());
  }

  private formatCurrency(currency: string): string {
    const upper = currency?.toUpperCase() || 'USD';
    return upper;
  }

  private determineCryptoCurrency(method: string | undefined): string {
    const normalized = method?.toUpperCase() ?? 'USDT';
    if (normalized === 'AUTO') return '';

    const map: Record<string, string> = {
      USDT: 'USDT',
      BTC: 'BTC',
      ETH: 'ETH',
      LTC: 'LTC',
      BCH: 'BCH',
      DOGE: 'DOGE',
      DASH: 'DASH',
      XMR: 'XMR',
      ZEC: 'ZEC',
      DAI: 'DAI',
      BTM: 'BTM',
      XEM: 'XEM',
      TRX: 'TRX',
      USDC: 'USDC',
      GUSD: 'GUSD',
      DGB: 'DGB',
    };

    return map[normalized] || 'USDT';
  }

  private resolveCallbackUrl(data: any): string | undefined {
    if (data.webhookUrl) return data.webhookUrl;
    if (process.env.NOWPAYMENTS_IPN_CALLBACK_URL) {
      return process.env.NOWPAYMENTS_IPN_CALLBACK_URL;
    }
    if (!process.env.BACKEND_URL) return undefined;

    const url = new URL('/webhooks/nowpayments', process.env.BACKEND_URL);
    if (data.filialId) url.searchParams.set('filialId', data.filialId);
    return url.toString();
  }
}
