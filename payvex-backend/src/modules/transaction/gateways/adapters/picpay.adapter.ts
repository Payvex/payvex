/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type PicPayCredentials = {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  sellerToken?: string;
  merchantId?: string;
};

export class PicPayAdapter implements PaymentGateway {
  private readonly baseUrl = 'https://api.picpay.com';

  async createPayment(
    data: any,
    credentials: PicPayCredentials,
  ): Promise<PaymentResponse> {
    if (
      !credentials.apiKey &&
      !(credentials.clientId && credentials.clientSecret)
    ) {
      throw new BadRequestException(
        'Credenciais PicPay não configuradas. Informe clientId/clientSecret ou x-picpay-token legado.',
      );
    }

    const paymentMethod = String(data.paymentMethod || 'PIX').toUpperCase();
    if (paymentMethod === 'BOLETO') {
      throw new BadRequestException(
        'PicPay Carteira não suporta boleto neste adapter.',
      );
    }

    try {
      const headers = await this.buildHeaders(credentials);
      const payload = this.buildPaymentPayload(data);

      const response = await axios.post(
        `${this.baseUrl}/ecommerce/v2/payments`,
        payload,
        { headers },
      );

      return this.formatResponse(response.data, payload.referenceId);
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.message ||
        error?.response?.data?.body?.fail ||
        error?.message ||
        'Falha ao processar pagamento no PicPay.';
      throw new BadRequestException(`[PicPay Gateway Error]: ${message}`);
    }
  }

  private async buildHeaders(credentials: PicPayCredentials) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (credentials.clientId && credentials.clientSecret) {
      headers.Authorization = `Bearer ${await this.getAccessToken(credentials)}`;
    } else if (credentials.apiKey) {
      headers['x-picpay-token'] = credentials.apiKey;
    }

    return headers;
  }

  private async getAccessToken(credentials: PicPayCredentials): Promise<string> {
    const response = await axios.post(
      `${this.baseUrl}/oauth2/token`,
      {
        grant_type: 'client_credentials',
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      },
    );

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new BadRequestException('PicPay não retornou access_token.');
    }

    return accessToken;
  }

  private buildPaymentPayload(data: any): Record<string, any> {
    const referenceId = this.referenceId(
      data.payvexReference || data.orderId || data.correlationId,
    );

    return {
      referenceId,
      callbackUrl: this.callbackUrl(data),
      returnUrl: data.returnUrl,
      value: this.formatAmount(data.amount),
      expiresAt: this.expiresAt(data.expirationDate),
      buyer: this.buildBuyer(data),
      additionalInfo: [
        {
          key: 'payvexReference',
          value: referenceId,
        },
        ...(data.filialId
          ? [
              {
                key: 'filialId',
                value: data.filialId,
              },
            ]
          : []),
      ],
    };
  }

  private buildBuyer(data: any): Record<string, any> {
    const document = this.cleanDocument(data.customerDocument);
    const phone = this.cleanDocument(data.customerPhone);
    const { firstName, lastName } = this.splitName(data.customerName);

    return {
      firstName,
      lastName,
      document,
      email: data.customerEmail,
      phone,
    };
  }

  private formatResponse(
    paymentData: any,
    referenceId: string,
  ): PaymentResponse {
    if (!paymentData) {
      return { externalId: referenceId, rawResponse: {} };
    }

    return {
      externalId: paymentData.referenceId || referenceId,
      paymentUrl:
        paymentData.paymentUrl ||
        paymentData.checkoutUrl ||
        paymentData.link ||
        undefined,
      pixQrCode:
        paymentData.qrcode?.content ||
        paymentData.qrCode ||
        paymentData.qrcode ||
        undefined,
      status: this.mapStatus(paymentData.status),
      rawResponse: paymentData,
    };
  }

  private callbackUrl(data: any): string {
    const explicitUrl = data.webhookUrl || process.env.PICPAY_CALLBACK_URL;
    const url =
      explicitUrl ||
      (process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/webhooks/picpay`
        : undefined);

    if (!url) {
      throw new BadRequestException(
        'Configure PICPAY_CALLBACK_URL ou BACKEND_URL para receber callbacks do PicPay.',
      );
    }

    const parsed = new URL(url);
    if (data.filialId && !parsed.searchParams.has('filialId')) {
      parsed.searchParams.set('filialId', data.filialId);
    }
    return parsed.toString();
  }

  private formatAmount(amount: number): number {
    return Number(Number(amount || 0).toFixed(2));
  }

  private expiresAt(expirationDate?: string): string {
    if (expirationDate) return new Date(expirationDate).toISOString();
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }

  private cleanDocument(value?: string): string | undefined {
    const cleaned = String(value || '').replace(/\D/g, '');
    return cleaned || undefined;
  }

  private splitName(name?: string) {
    const parts = String(name || 'Cliente Payvex').trim().split(/\s+/);
    const firstName = parts.shift() || 'Cliente';
    const lastName = parts.join(' ') || 'Payvex';
    return { firstName, lastName };
  }

  private referenceId(value?: string): string {
    return String(value || `payvex-${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 64);
  }

  private mapStatus(status?: string): PaymentResponse['status'] {
    const normalized = String(status || '').toLowerCase();
    if (['paid', 'completed', 'approved'].includes(normalized)) return 'PAID';
    if (['expired'].includes(normalized)) return 'EXPIRED';
    if (['refunded', 'chargeback', 'cancelled', 'canceled'].includes(normalized))
      return 'CANCELED';
    if (['analysis', 'created'].includes(normalized)) return 'PENDING';
    return 'PENDING';
  }
}
