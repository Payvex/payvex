/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type PagSeguroCredentials = {
  email?: string;
  token?: string;
  salt?: string;
  sandbox?: boolean;
};

export class PagSeguroAdapter implements PaymentGateway {
  private readonly productionUrl = 'https://ws.pagseguro.uol.com.br';
  private readonly sandboxUrl = 'https://ws.sandbox.pagseguro.uol.com.br';

  async createPayment(
    data: any,
    credentials: PagSeguroCredentials,
  ): Promise<PaymentResponse> {
    if (!credentials.email || !credentials.token) {
      throw new BadRequestException(
        'Credenciais do PagSeguro não configuradas (e-mail e token obrigatórios).',
      );
    }

    if (String(data.paymentMethod || '').toUpperCase() === 'PIX') {
      throw new BadRequestException(
        'PagSeguro Checkout legado não suporta PIX neste adapter. Use PagBank para PIX.',
      );
    }

    try {
      const isSandbox = data.sandbox ?? credentials.sandbox ?? false;
      const baseUrl = isSandbox ? this.sandboxUrl : this.productionUrl;
      const payload = this.buildCheckoutPayload(data, credentials);

      const response = await axios.post(`${baseUrl}/v2/checkout`, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Accept: 'application/xml',
        },
        responseType: 'text',
      });

      const checkoutCode = this.extractXmlTag(response.data, 'code');
      if (!checkoutCode) {
        throw new BadRequestException(
          'PagSeguro não retornou o código do checkout.',
        );
      }

      return {
        externalId: checkoutCode,
        paymentUrl: this.checkoutUrl(checkoutCode, isSandbox),
        rawResponse: {
          checkoutCode,
          xml: response.data,
        },
      };
    } catch (error: any) {
      const message =
        this.extractXmlTag(error?.response?.data, 'message') ||
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento no PagSeguro.';
      throw new BadRequestException(`[PagSeguro Gateway Error]: ${message}`);
    }
  }

  private buildCheckoutPayload(
    data: any,
    credentials: PagSeguroCredentials,
  ): URLSearchParams {
    const params = new URLSearchParams();
    const quantity = Number(data.quantity || 1);
    const unitAmount = Number(data.amount || 0) / quantity;
    const reference = String(
      data.payvexReference || data.orderId || `payvex-${Date.now()}`,
    );
    const phone = this.cleanDocument(data.customerPhone);

    params.set('email', credentials.email || '');
    params.set('token', credentials.token || '');
    params.set('currency', 'BRL');
    params.set('reference', reference);
    params.set('itemId1', String(data.itemId || reference).slice(0, 100));
    params.set(
      'itemDescription1',
      String(data.itemName || data.description || 'Pagamento Payvex').slice(
        0,
        100,
      ),
    );
    params.set('itemAmount1', unitAmount.toFixed(2));
    params.set('itemQuantity1', String(quantity));
    params.set('senderName', data.customerName || 'Cliente Payvex');
    params.set('senderEmail', data.customerEmail || credentials.email || '');
    params.set('shippingAddressRequired', 'false');

    const document = this.cleanDocument(data.customerDocument);
    if (document) {
      params.set('senderCPF', document.length <= 11 ? document : '');
      if (document.length > 11) params.set('senderCNPJ', document);
    }

    if (phone && phone.length >= 10) {
      params.set('senderAreaCode', phone.slice(0, 2));
      params.set('senderPhone', phone.slice(2));
    }

    const notificationUrl = this.notificationUrl(data);
    if (notificationUrl) params.set('notificationURL', notificationUrl);
    if (data.returnUrl) params.set('redirectURL', data.returnUrl);

    return params;
  }

  private notificationUrl(data: any): string | undefined {
    const explicitUrl = data.webhookUrl || process.env.PAGSEGURO_WEBHOOK_URL;
    const url =
      explicitUrl ||
      (process.env.BACKEND_URL
        ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/webhooks/pagseguro`
        : undefined);

    if (!url) return undefined;

    const parsed = new URL(url);
    if (data.filialId && !parsed.searchParams.has('filialId')) {
      parsed.searchParams.set('filialId', data.filialId);
    }
    return parsed.toString();
  }

  private checkoutUrl(code: string, sandbox: boolean): string {
    const host = sandbox
      ? 'https://sandbox.pagseguro.uol.com.br'
      : 'https://pagseguro.uol.com.br';
    return `${host}/v2/checkout/payment.html?code=${encodeURIComponent(code)}`;
  }

  private extractXmlTag(xml: unknown, tagName: string): string | undefined {
    if (typeof xml !== 'string') return undefined;

    const match = xml.match(new RegExp(`<${tagName}>([^<]+)</${tagName}>`, 'i'));
    return match?.[1]?.trim();
  }

  private cleanDocument(value?: string): string | undefined {
    const cleaned = String(value || '').replace(/\D/g, '');
    return cleaned || undefined;
  }
}
