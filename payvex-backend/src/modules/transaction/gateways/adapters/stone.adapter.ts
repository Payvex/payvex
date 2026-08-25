/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type StoneCredentials = {
  apiKey?: string;
  clientId?: string;
  secret?: string;
  sandbox?: boolean;
};

export class StoneAdapter implements PaymentGateway {
  private readonly endpoint = 'https://payments.stone.com.br/v1/charges';

  async createPayment(
    data: any,
    credentials: StoneCredentials,
  ): Promise<PaymentResponse> {
    if (!credentials.apiKey) {
      throw new BadRequestException(
        'Secret Key Stone Online não configurada. O fluxo de gateway usa Basic Auth com sk_...',
      );
    }

    if (String(data.paymentMethod || '').toUpperCase() !== 'CREDIT_CARD') {
      throw new BadRequestException(
        'Stone Online 4.0 neste adapter suporta cartão. Para PIX/Boleto use Pagar.me, PagBank, Asaas ou outro gateway compatível.',
      );
    }

    try {
      const payload = this.buildChargePayload(data);
      const response = await axios.post(this.endpoint, payload, {
        headers: this.buildHeaders(credentials),
      });

      return this.formatResponse(response.data);
    } catch (error: any) {
      const message =
        error?.response?.data?.details?.description ||
        error?.response?.data?.details?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento na Stone.';
      throw new BadRequestException(`[Stone Gateway Error]: ${message}`);
    }
  }

  private buildHeaders(credentials: StoneCredentials) {
    const host = credentials.sandbox
      ? 'sdx-ecommerce-payments.stone.com.br'
      : 'ecommerce-payments.stone.com.br';

    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Host: host,
      Authorization: `Basic ${Buffer.from(`${credentials.apiKey}:`).toString('base64')}`,
    };
  }

  private buildChargePayload(data: any): Record<string, any> {
    const referenceId = this.referenceId(
      data.payvexReference || data.orderId || data.referenceId,
    );
    const amount = this.formatAmount(data.amount);

    return {
      payment_method: 'card',
      amount,
      currency_code: '986',
      initiator_id: referenceId,
      reference_id: referenceId,
      local_datetime: this.localDateTime(data.localDatetime),
      channel: data.channel || 'website',
      statement_descriptor: this.statementDescriptor(
        data.statementDescriptor || data.description,
      ),
      card_transaction: {
        type: 'credit',
        operation_type: data.capture === false ? 'auth_only' : 'auth_and_capture',
        installment_count: Number(data.installments || 1),
        card: this.buildCard(data),
      },
      initiator: {
        initiating_entity: data.initiatingEntity || 'account_holder',
        initiating_reason: data.initiatingReason || 'credentials_on_file',
      },
      customer: this.buildCustomer(data),
      items: [
        {
          reference_id: String(data.itemId || referenceId),
          name: data.itemName || data.description || 'Pagamento Payvex',
          quantity: Number(data.quantity || 1),
          amount,
        },
      ],
    };
  }

  private buildCard(data: any): Record<string, any> {
    if (data.cardToken || data.cardId || data.paymentToken) {
      return {
        entry_mode: 'credentials_on_file',
        credential_id: data.cardToken || data.cardId || data.paymentToken,
        cvv: data.securityCode,
      };
    }

    if (!data.cardNumber || !data.expiryMonth || !data.expiryYear) {
      throw new BadRequestException(
        'Stone cartão exige cardNumber, expiryMonth e expiryYear ou cardToken/cardId/paymentToken.',
      );
    }

    return {
      entry_mode: 'credentials_on_file',
      number: this.cleanDocument(data.cardNumber),
      expiration_date: this.expirationDate(data.expiryMonth, data.expiryYear),
      cvv: data.securityCode,
      holder_name: data.cardHolder || data.customerName || 'Cliente Payvex',
    };
  }

  private buildCustomer(data: any): Record<string, any> | undefined {
    if (!data.customerName && !data.customerEmail && !data.customerDocument) {
      return undefined;
    }

    return {
      name: data.customerName,
      email: data.customerEmail,
      document: this.cleanDocument(data.customerDocument),
      phone: this.cleanDocument(data.customerPhone),
    };
  }

  private formatResponse(paymentData: any): PaymentResponse {
    if (!paymentData) {
      return { externalId: '', rawResponse: {} };
    }

    return {
      externalId: paymentData.id || paymentData.initiator_id || '',
      status: this.mapStatus(paymentData.status, paymentData?.card_transaction?.result),
      rawResponse: paymentData,
    };
  }

  private mapStatus(
    rawStatus?: string,
    transactionResult?: string,
  ): PaymentResponse['status'] {
    const status = String(rawStatus || '').toLowerCase();
    const result = String(transactionResult || '').toLowerCase();

    if (status === 'paid') return 'PAID';
    if (status === 'authorized') return 'PENDING';
    if (status === 'canceled') return 'CANCELED';
    if (status === 'declined' || result === 'failed') return 'FAILED';
    return 'PENDING';
  }

  private formatAmount(amount: number): number {
    return Math.round(Number(amount || 0) * 100);
  }

  private cleanDocument(value?: string): string | undefined {
    const cleaned = String(value || '').replace(/\D/g, '');
    return cleaned || undefined;
  }

  private expirationDate(month: string, year: string): string {
    const mm = String(month).padStart(2, '0').slice(-2);
    const yyyy = String(year);
    const yy = yyyy.length === 4 ? yyyy.slice(-2) : yyyy.padStart(2, '0');
    return `${mm}${yy}`;
  }

  private localDateTime(value?: string): string {
    const date = value ? new Date(value) : new Date();
    return date.toISOString().slice(0, 19);
  }

  private referenceId(value?: string): string {
    return String(value || `payvex-${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 123);
  }

  private statementDescriptor(value?: string): string | undefined {
    const descriptor = String(value || 'PAYVEX')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, 22);
    return descriptor || undefined;
  }
}
