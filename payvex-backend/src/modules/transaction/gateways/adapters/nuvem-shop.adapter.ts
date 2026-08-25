/* eslint-disable @typescript-eslint/no-unsafe-argument */

import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class NuvemShopAdapter implements PaymentGateway {
  private getBaseUrl(storeId: string) {
    const apiHost =
      process.env.NUVEMSHOP_API_HOST || 'https://api.tiendanube.com';
    return `${apiHost.replace(/\/+$/, '')}/v1/${storeId}`;
  }

  private getHeaders(
    accessToken: string,
    userAgent: string = process.env.NUVEMSHOP_USER_AGENT || 'Payvex/1.0 (integracoes@payvex.com)',
  ): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': userAgent,
    };
  }

  async createPayment(data: any, credentials: any): Promise<PaymentResponse> {
    const { accessToken, storeId } = credentials;

    if (!accessToken || !storeId) {
      throw new BadRequestException('Credenciais da Nuvem Shop incompletas.');
    }

    const endpoint = `${this.getBaseUrl(storeId)}/payvex/transactions`;

    try {
      const response = await axios.post(endpoint, data, {
        headers: this.getHeaders(accessToken),
        timeout: 30000,
      });

      const body = response.data;

      return {
        externalId: body.id || `ns_${Date.now()}`,
        paymentUrl: body.paymentUrl || undefined,
        pixQrCode: body.pixQrCode || undefined,
        rawResponse: body,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Falha ao criar pagamento na Nuvem Shop: ${error?.response?.data?.message || error.message}`,
      );
    }
  }

  async validate(credentials: any): Promise<boolean> {
    const { accessToken, storeId } = credentials;

    if (!accessToken || !storeId) {
      return false;
    }

    try {
      const endpoint = `${this.getBaseUrl(storeId)}/store`;
      const response = await axios.get(endpoint, {
        headers: this.getHeaders(accessToken),
        timeout: 10000,
      });

      return response.status === 200;
    } catch {
      return false;
    }
  }

  async refund(externalId: string, credentials: any): Promise<PaymentResponse> {
    const { accessToken, storeId } = credentials;

    if (!accessToken || !storeId) {
      throw new BadRequestException('Credenciais da Nuvem Shop incompletas.');
    }

    const endpoint = `${this.getBaseUrl(storeId)}/payvex/transactions/${externalId}/refund`;

    try {
      const response = await axios.post(
        endpoint,
        {},
        {
          headers: this.getHeaders(accessToken),
          timeout: 30000,
        },
      );

      const body = response.data;

      return {
        externalId: body.id || externalId,
        paymentUrl: body.paymentUrl || undefined,
        pixQrCode: body.pixQrCode || undefined,
        rawResponse: body,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Falha ao processar reembolso na Nuvem Shop: ${error?.response?.data?.message || error.message}`,
      );
    }
  }

  async registerWebhook(
    credentials: { accessToken: string; storeId: string },
    event: string,
    url: string,
  ) {
    const { accessToken, storeId } = credentials;
    if (!accessToken || !storeId) {
      throw new BadRequestException('Credenciais da Nuvem Shop incompletas.');
    }

    const endpoint = `${this.getBaseUrl(storeId)}/webhooks`;
    const headers = this.getHeaders(accessToken);

    try {
      const current = await axios.get(endpoint, {
        headers,
        timeout: 10000,
      });
      const match = current.data?.find(
        (webhook: any) => webhook?.event === event && webhook?.url === url,
      );
      if (match) return match;
    } catch {
      // Continua para a tentativa de criação; algumas contas podem não listar antes.
    }

    const response = await axios.post(
      endpoint,
      { event, url },
      {
        headers,
        timeout: 30000,
      },
    );

    return response.data;
  }

  async registerDefaultWebhooks(credentials: {
    accessToken: string;
    storeId: string;
    filialId: string;
  }) {
    const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '');
    if (!backendUrl) return [];

    const events = [
      'order/paid',
      'order/cancelled',
      'order/voided',
      'app/uninstalled',
    ];
    const url = `${backendUrl}/webhooks/nuvem-shop?filialId=${encodeURIComponent(
      credentials.filialId,
    )}`;
    const results: any[] = [];

    for (const event of events) {
      results.push(await this.registerWebhook(credentials, event, url));
    }

    return results;
  }
}
