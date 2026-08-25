/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type PagBankCredentials = {
  accessToken?: string;
  privateKey?: string;
  sandbox?: boolean;
};

export class PagBankAdapter implements PaymentGateway {
  async createPayment(
    data: any,
    credentials: PagBankCredentials,
  ): Promise<PaymentResponse> {
    const accessToken = credentials.accessToken || credentials.privateKey;
    if (!accessToken) {
      throw new BadRequestException(
        'Token de autenticação do PagBank não configurado.',
      );
    }

    try {
      const paymentMethod = String(data.paymentMethod || 'PIX').toUpperCase();
      const currency = data.currency || 'BRL';
      const amount = this.formatAmount(data.amount);
      const referenceId =
        data.payvexReference || data.orderId || `payvex-${Date.now()}`;
      const headers = {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'x-idempotency-key': String(referenceId),
        Authorization: `Bearer ${accessToken}`,
      };

      const payload = this.buildOrderPayload(data, paymentMethod, amount, referenceId);
      const baseUrl = this.resolveBaseUrl(credentials.sandbox || data.sandbox);

      const response = await axios.post(`${baseUrl}/orders`, payload, { headers });

      const paymentData = response.data;
      const charge = paymentData?.charges?.[0];
      const qrCode = paymentData?.qr_codes?.[0];

      return {
        externalId: paymentData.id || charge?.id || '',
        paymentUrl: this.findLink(paymentData, [
          'PAY',
          'BOLETO.PDF',
          'BOLETO',
          'QRCODE.PNG',
          'QRCODE.BASE64',
        ]),
        pixQrCode: qrCode?.text || paymentData?.qr_code?.text || undefined,
        rawResponse: paymentData,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.error_messages?.[0]?.description ||
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento no PagBank.';
      throw new BadRequestException(`[PagBank Gateway Error]: ${message}`);
    }
  }

  private buildOrderPayload(
    data: any,
    paymentMethod: string,
    amount: number,
    referenceId: string,
  ): Record<string, any> {
    const payload: Record<string, any> = {
      reference_id: referenceId,
      customer: this.buildCustomer(data),
      items: [
        {
          reference_id: String(data.itemId || referenceId),
          name: data.itemName || data.description || 'Pagamento Payvex',
          quantity: Number(data.quantity || 1),
          unit_amount: amount,
        },
      ],
      notification_urls: this.buildNotificationUrls(data),
    };

    if (paymentMethod === 'PIX') {
      payload.qr_codes = [
        {
          amount: {
            value: amount,
          },
          expiration_date: this.resolvePixExpiration(data.expirationDate),
        },
      ];
      return payload;
    }

    payload.charges = [this.buildCharge(data, paymentMethod, amount, referenceId)];
    return payload;
  }

  private buildCustomer(data: any): Record<string, any> {
    const customer: Record<string, any> = {
      name: data.customerName || 'Cliente Payvex',
      email: data.customerEmail,
    };

    const taxId = this.cleanDocument(data.customerDocument);
    if (taxId) customer.tax_id = taxId;

    const phone = this.cleanDocument(data.customerPhone);
    if (phone && phone.length >= 10) {
      customer.phones = [
        {
          country: '55',
          area: phone.slice(0, 2),
          number: phone.slice(2),
          type: 'MOBILE',
        },
      ];
    }

    return customer;
  }

  private buildCharge(
    data: any,
    paymentMethod: string,
    amount: number,
    referenceId: string,
  ): Record<string, any> {
    const charge: Record<string, any> = {
      reference_id: referenceId,
      description: data.description || data.itemName || 'Pagamento Payvex',
      amount: {
        value: amount,
        currency: data.currency || 'BRL',
      },
      payment_method: this.buildPaymentMethod(data, paymentMethod),
    };

    return charge;
  }

  private buildPaymentMethod(data: any, paymentMethod: string): Record<string, any> {
    if (paymentMethod === 'BOLETO') {
      return {
        type: 'BOLETO',
        boleto: {
          due_date: this.resolveBoletoDueDate(data.expirationDate),
          template: 'PROPOSTA',
          days_until_expiration: '3',
          holder: {
            name: data.customerName || 'Cliente Payvex',
            tax_id: this.requireDocument(data.customerDocument),
            email: data.customerEmail,
            address: this.buildBoletoAddress(data),
          },
          instruction_lines: {
            line_1: 'Pagamento ate a data de vencimento',
            line_2: 'Payvex',
          },
        },
      };
    }

    if (paymentMethod === 'CREDIT_CARD') {
      const cardId = data.cardId || data.cardToken;
      if (!cardId && !data.encryptedCard) {
        throw new BadRequestException(
          'PagBank cartão exige cardId/cardToken ou encryptedCard. Não envie número aberto de cartão.',
        );
      }

      return {
        type: 'CREDIT_CARD',
        installments: Number(data.installments || 1),
        capture: true,
        soft_descriptor: this.softDescriptor(data.statementDescriptor),
        card: {
          ...(cardId ? { id: cardId } : {}),
          ...(data.encryptedCard ? { encrypted: data.encryptedCard } : {}),
          ...(data.securityCode ? { security_code: data.securityCode } : {}),
        },
      };
    }

    throw new BadRequestException(
      `Método ${paymentMethod} não suportado no PagBank.`,
    );
  }

  private buildNotificationUrls(data: any): string[] {
    const explicitUrl = data.webhookUrl || process.env.PAGBANK_WEBHOOK_URL;
    if (explicitUrl) return [explicitUrl];

    const backendUrl = process.env.BACKEND_URL;
    return backendUrl ? [`${backendUrl.replace(/\/$/, '')}/webhooks/pagbank`] : [];
  }

  private buildBoletoAddress(data: any): Record<string, string> {
    const postalCode = this.cleanDocument(data.postalCode || data.cep);
    if (
      !data.street ||
      !data.number ||
      !postalCode ||
      !data.city ||
      !data.regionCode
    ) {
      throw new BadRequestException(
        'PagBank boleto exige endereço do pagador: street, number, postalCode/cep, city e regionCode.',
      );
    }

    return {
      street: String(data.street),
      number: String(data.number),
      complement: String(data.complement || ''),
      locality: String(data.locality || data.neighborhood || ''),
      city: String(data.city),
      region: String(data.regionCode),
      region_code: String(data.regionCode).slice(0, 2).toUpperCase(),
      country: 'Brasil',
      postal_code: postalCode,
    };
  }

  private formatAmount(amount: number): number {
    return Math.round(Number(amount || 0) * 100);
  }

  private cleanDocument(doc: string | undefined): string | undefined {
    const cleaned = String(doc || '').replace(/\D/g, '');
    return cleaned || undefined;
  }

  private requireDocument(doc: string | undefined): string {
    const cleaned = this.cleanDocument(doc);
    if (!cleaned) {
      throw new BadRequestException('PagBank boleto exige CPF/CNPJ do pagador.');
    }
    return cleaned;
  }

  private resolveBaseUrl(sandbox?: boolean): string {
    return sandbox
      ? 'https://sandbox.api.pagseguro.com'
      : 'https://api.pagseguro.com';
  }

  private resolvePixExpiration(expirationDate?: string): string {
    if (expirationDate) return new Date(expirationDate).toISOString();
    return new Date(Date.now() + 30 * 60 * 1000).toISOString();
  }

  private resolveBoletoDueDate(expirationDate?: string): string {
    if (expirationDate) return expirationDate.slice(0, 10);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    return dueDate.toISOString().slice(0, 10);
  }

  private softDescriptor(value?: string): string {
    return String(value || 'PAYVEX')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 17);
  }

  private findLink(order: any, rels: string[]): string | undefined {
    const links = [
      ...(Array.isArray(order?.links) ? order.links : []),
      ...(Array.isArray(order?.charges?.[0]?.links) ? order.charges[0].links : []),
      ...(Array.isArray(order?.qr_codes?.[0]?.links) ? order.qr_codes[0].links : []),
    ];

    for (const rel of rels) {
      const found = links.find(
        (link: any) => String(link?.rel || '').toUpperCase() === rel,
      );
      if (found?.href) return found.href;
    }

    return undefined;
  }
}
