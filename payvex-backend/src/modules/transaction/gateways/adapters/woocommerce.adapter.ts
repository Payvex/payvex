/* eslint-disable @typescript-eslint/no-unsafe-argument */

import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class WooCommerceAdapter implements PaymentGateway {
  private getAuthHeader(consumerKey: string, consumerSecret: string): string {
    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`,
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  private getAuthConfig(consumerKey: string, consumerSecret: string) {
    return {
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.getAuthHeader(consumerKey, consumerSecret),
      },
      params: {
        consumer_key: consumerKey,
        consumer_secret: consumerSecret,
      },
    };
  }

  async createPayment(data: any, credentials: any): Promise<PaymentResponse> {
    const { url, consumerKey, consumerSecret } = credentials;

    if (!url || !consumerKey || !consumerSecret) {
      throw new BadRequestException('Credenciais do WooCommerce incompletas.');
    }

    const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wc/v3/payvex/transactions`;

    try {
      const response = await axios.post(endpoint, data, {
        ...this.getAuthConfig(consumerKey, consumerSecret),
        timeout: 30000,
      });

      const body = response.data;

      return {
        externalId: body.id || `wc_${Date.now()}`,
        paymentUrl: body.paymentUrl || undefined,
        pixQrCode: body.pixQrCode || undefined,
        rawResponse: body,
      };
    } catch (error: any) {
      throw new BadRequestException(
        `Falha ao criar pagamento no WooCommerce: ${error?.response?.data?.message || error.message}`,
      );
    }
  }

  async validate(credentials: any): Promise<boolean> {
    const { url, consumerKey, consumerSecret } = credentials;

    if (!url || !consumerKey || !consumerSecret) {
      return false;
    }

    try {
      for (const version of ['v3', 'v2']) {
        const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wc/${version}/system_status`;
        const response = await axios.get(endpoint, {
          ...this.getAuthConfig(consumerKey, consumerSecret),
          timeout: 10000,
          validateStatus: () => true,
        });

        if (response.status === 200) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  async refund(externalId: string, credentials: any): Promise<PaymentResponse> {
    const { url, consumerKey, consumerSecret } = credentials;

    if (!url || !consumerKey || !consumerSecret) {
      throw new BadRequestException('Credenciais do WooCommerce incompletas.');
    }

    const endpoint = `${url.replace(/\/+$/, '')}/wp-json/wc/v3/payvex/transactions/${externalId}/refund`;

    try {
      const response = await axios.post(
        endpoint,
        {},
        {
          ...this.getAuthConfig(consumerKey, consumerSecret),
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
        `Falha ao processar reembolso no WooCommerce: ${error?.response?.data?.message || error.message}`,
      );
    }
  }
}
