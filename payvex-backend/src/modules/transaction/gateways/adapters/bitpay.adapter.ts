/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class BitPayAdapter implements PaymentGateway {
  async createPayment(
    data: any,
    credentials: { token?: string; sandbox?: boolean },
  ): Promise<PaymentResponse> {
    if (!credentials.token) {
      throw new BadRequestException('Token POS do BitPay não configurado.');
    }

    try {
      const baseUrl = credentials.sandbox
        ? 'https://test.bitpay.com'
        : 'https://bitpay.com';
      const referenceId =
        data.payvexReference || data.orderId || `bitpay-${Date.now()}`;
      const notificationURL = this.resolveNotificationUrl(data);
      const forcedCurrency = this.resolveForcedCryptoCurrency(data.cryptoCurrency);

      const response = await axios.post(
        `${baseUrl}/invoices`,
        {
          token: credentials.token,
          price: this.formatAmount(data.amount),
          currency: this.formatCurrency(data.currency || 'USD'),
          orderId: referenceId,
          itemDesc: data.description || `Pagamento Payvex ${referenceId}`,
          posData: JSON.stringify({
            payvexReference: referenceId,
            filialId: data.filialId,
          }),
          fullNotifications: true,
          extendedNotifications: true,
          ...(notificationURL ? { notificationURL } : {}),
          ...(data.successUrl || data.returnUrl
            ? { redirectURL: data.successUrl || data.returnUrl }
            : {}),
          ...(data.cancelUrl ? { closeURL: data.cancelUrl } : {}),
          ...(forcedCurrency
            ? {
                forcedBuyerSelectedTransactionCurrency: forcedCurrency,
              }
            : {}),
          ...(data.customerEmail
            ? { buyer: { email: data.customerEmail, name: data.customerName } }
            : {}),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Accept-Version': '2.0.0',
          },
        },
      );

      const invoice = response.data?.data || response.data;
      return {
        externalId: String(invoice?.id || referenceId),
        paymentUrl: invoice?.url,
        status: 'PENDING',
        rawResponse: response.data,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento no BitPay.';
      throw new BadRequestException(`[BitPay Gateway Error]: ${message}`);
    }
  }

  private formatAmount(amount: number): number {
    return Number(Number(amount || 0).toFixed(2));
  }

  private formatCurrency(currency: string): string {
    return String(currency || 'USD').toUpperCase();
  }

  private resolveForcedCryptoCurrency(currency?: string): string | undefined {
    const normalized = String(currency || '').toUpperCase();
    const supported = new Set([
      'BTC',
      'BCH',
      'ETH',
      'GUSD',
      'PAX',
      'BUSD',
      'USDC',
      'XRP',
      'DOGE',
      'DAI',
      'WBTC',
    ]);

    return supported.has(normalized) ? normalized : undefined;
  }

  private resolveNotificationUrl(data: any): string | undefined {
    if (data.webhookUrl) return data.webhookUrl;
    if (process.env.BITPAY_NOTIFICATION_URL) {
      return process.env.BITPAY_NOTIFICATION_URL;
    }
    if (!process.env.BACKEND_URL) return undefined;

    const url = new URL('/webhooks/bitpay', process.env.BACKEND_URL);
    if (data.filialId) url.searchParams.set('filialId', data.filialId);
    return url.toString();
  }
}
