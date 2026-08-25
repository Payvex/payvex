/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type PagarMeCredentials = {
  apiKey?: string;
  secretKey?: string;
  gatewayUrl?: string;
};

export class PagarMeAdapter implements PaymentGateway {
  private readonly baseUrl = 'https://api.pagar.me/core/v5';

  async createPayment(
    data: any,
    credentials: PagarMeCredentials,
  ): Promise<PaymentResponse> {
    const apiKey = credentials.apiKey || credentials.secretKey;
    if (!apiKey) {
      throw new BadRequestException('Secret Key do Pagar.me não informada.');
    }

    try {
      const amount = this.formatAmount(data.amount);
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      };

      const payload = this.buildOrderPayload(data, amount);
      const response = await axios.post(`${this.baseUrl}/orders`, payload, {
        headers,
      });

      const order = response.data;
      const charge = order?.charges?.[0];
      const transaction = charge?.last_transaction;
      const externalId = order?.id || charge?.id;

      if (!externalId) {
        throw new BadRequestException(
          'Pagar.me não retornou identificador do pedido.',
        );
      }

      return {
        externalId: String(externalId),
        paymentUrl:
          transaction?.url ||
          transaction?.pdf ||
          transaction?.line ||
          charge?.payment_url ||
          undefined,
        pixQrCode:
          transaction?.qr_code ||
          transaction?.qr_code_url ||
          transaction?.qr_code_image ||
          undefined,
        rawResponse: order,
      };
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message ||
        error?.response?.data?.error?.message ||
        error?.message ||
        'Falha ao processar pagamento no Pagar.me.';
      throw new BadRequestException(`[Pagar.me Gateway Error]: ${message}`);
    }
  }

  private buildOrderPayload(data: any, amount: number) {
    const payvexReference =
      data.payvexReference || data.orderId || `payvex-${Date.now()}`;

    return {
      code: String(payvexReference),
      items: [
        {
          amount,
          description: data.description || data.itemName || 'Pagamento Payvex',
          quantity: Number(data.quantity || 1),
          code: String(data.itemId || payvexReference),
        },
      ],
      customer: this.buildCustomer(data),
      payments: [this.buildPayment(data, amount)],
      closed: true,
      metadata: {
        ...(data.metadata || {}),
        filialId: data.filialId,
        payvexReference,
      },
    };
  }

  private buildPayment(data: any, amount: number) {
    const method = String(data.paymentMethod || 'PIX').toUpperCase();

    if (method === 'PIX') {
      return {
        payment_method: 'pix',
        pix: {
          expires_in: Number(data.pixExpiresIn || 3600),
        },
      };
    }

    if (method === 'BOLETO') {
      return {
        payment_method: 'boleto',
        boleto: {
          due_at: this.resolveBoletoDueDate(data.expirationDate),
        },
      };
    }

    if (method === 'CREDIT_CARD') {
      return this.buildCreditCardPayment(data, amount);
    }

    throw new BadRequestException(`Método ${method} não suportado no Pagar.me.`);
  }

  private buildCreditCardPayment(data: any, amount: number) {
    if (!data.cardToken && !data.cardId) {
      throw new BadRequestException(
        'Pagar.me cartão exige cardToken ou cardId. Tokenize o cartão no front usando a Public Key.',
      );
    }

    return {
      payment_method: 'credit_card',
      credit_card: {
        installments: Number(data.installments || 1),
        statement_descriptor: this.statementDescriptor(data.statementDescriptor),
        ...(data.cardToken ? { card_token: data.cardToken } : {}),
        ...(data.cardId ? { card_id: data.cardId } : {}),
      },
      amount,
    };
  }

  private buildCustomer(data: any) {
    const document = this.onlyDigits(data.customerDocument);
    const phone = this.onlyDigits(data.customerPhone);

    const customer: Record<string, any> = {
      name: data.customerName || 'Cliente Payvex',
      email: data.customerEmail,
    };

    if (document) {
      customer.document = document;
      customer.type = document.length > 11 ? 'company' : 'individual';
    }

    if (phone && phone.length >= 10) {
      customer.phones = {
        mobile_phone: {
          country_code: '55',
          area_code: phone.slice(0, 2),
          number: phone.slice(2),
        },
      };
    }

    return customer;
  }

  private formatAmount(amount: number): number {
    return Math.round(Number(amount || 0) * 100);
  }

  private onlyDigits(value?: string): string | undefined {
    const digits = String(value || '').replace(/\D/g, '');
    return digits || undefined;
  }

  private resolveBoletoDueDate(expirationDate?: string): string {
    if (expirationDate) {
      return expirationDate.slice(0, 10);
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    return dueDate.toISOString().slice(0, 10);
  }

  private statementDescriptor(value?: string): string {
    return String(value || 'PAYVEX')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, 13);
  }
}
