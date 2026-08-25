/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class AsaasAdapter implements PaymentGateway {
  private readonly productionUrl = 'https://api.asaas.com/v3';
  private readonly sandboxUrl = 'https://api-sandbox.asaas.com/v3';

  async createPayment(
    data: any,
    credentials: { apiKey: string; sandbox?: boolean },
  ): Promise<PaymentResponse> {
    if (!credentials.apiKey) {
      throw new BadRequestException('API Key do Asaas não configurada.');
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        access_token: credentials.apiKey,
      };
      const baseUrl = credentials.sandbox ? this.sandboxUrl : this.productionUrl;

      const customerInfo = await this.getOrCreateCustomer(data, headers, baseUrl);
      const paymentData = await this.createAsaasPayment(
        data,
        customerInfo,
        headers,
        baseUrl,
      );
      const pixQrCode =
        paymentData.billingType === 'PIX'
          ? await this.getPixQrCode(paymentData.id, headers, baseUrl)
          : undefined;

      return this.formatResponse(paymentData, pixQrCode);
    } catch (error: any) {
      const message =
        error?.response?.data?.errors?.[0]?.description ||
        error?.response?.data?.error ||
        error?.message ||
        'Falha ao processar pagamento no Asaas.';
      throw new BadRequestException(`[Asaas Gateway Error]: ${message}`);
    }
  }

  private async getOrCreateCustomer(
    data: any,
    headers: any,
    baseUrl: string,
  ): Promise<any> {
    const customers = await axios.get(`${baseUrl}/customers`, {
      headers,
      params: {
        email: data.customerEmail,
        cpfCnpj: this.cleanDocument(data.customerDocument),
      },
    });

    const existing = customers.data?.data?.find(
      (c: any) =>
        (data.customerEmail && c.email === data.customerEmail) ||
        (data.customerDocument &&
          this.cleanDocument(c.cpfCnpj) ===
            this.cleanDocument(data.customerDocument)),
    );
    if (existing) {
      return existing;
    }

    if (!data.customerDocument) {
      throw new BadRequestException(
        'Asaas exige CPF/CNPJ do cliente para criar o cadastro do pagador.',
      );
    }

    const customer = await axios.post(
      `${baseUrl}/customers`,
      {
        name: data.customerName || 'Cliente Payvex',
        email: data.customerEmail,
        cpfCnpj: this.cleanDocument(data.customerDocument),
        mobilePhone: data.customerPhone,
        externalReference: data.customerId || data.customerDocument,
        notificationDisabled: data.notificationDisabled ?? false,
      },
      { headers },
    );

    return customer.data;
  }

  private async createAsaasPayment(
    data: any,
    customer: any,
    headers: any,
    baseUrl: string,
  ): Promise<any> {
    const paymentType = this.determinePaymentType(data.paymentMethod);
    const dueDateStr = this.formatDate(data.expirationDate);

    const payload: Record<string, any> = {
      customer: customer.id,
      billingType: paymentType,
      dueDate: dueDateStr,
      value: this.formatAmount(data.amount),
      description: data.description || 'Pagamento',
      externalReference:
        data.payvexReference || data.orderId || data.filialId || undefined,
    };

    if (data.returnUrl) {
      payload.callback = {
        successUrl: data.returnUrl,
        autoRedirect: false,
      };
    }

    if (paymentType === 'CREDIT_CARD') {
      this.addCreditCardData(payload, data);
    }

    if (paymentType === 'CREDIT_CARD' && Number(data.installments || 1) > 1) {
      delete payload.value;
      payload.installmentCount = Number(data.installments);
      payload.totalValue = this.formatAmount(data.amount);
    }

    const response = await axios.post(
      `${baseUrl}/payments`,
      payload,
      { headers },
    );
    return response.data;
  }

  private async getPixQrCode(
    paymentId: string | undefined,
    headers: any,
    baseUrl: string,
  ): Promise<any | undefined> {
    if (!paymentId) return undefined;

    try {
      const response = await axios.get(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
        headers,
      });
      return response.data;
    } catch {
      return undefined;
    }
  }

  private addCreditCardData(payload: Record<string, any>, data: any) {
    if (!data.cardNumber && !data.cardToken) return;

    if (!data.cardNumber || !data.expiryMonth || !data.expiryYear || !data.securityCode) {
      throw new BadRequestException(
        'Asaas cartão via API exige cardNumber, expiryMonth, expiryYear e securityCode. Sem esses dados, use a invoiceUrl do Asaas.',
      );
    }

    payload.creditCard = {
      holderName: data.cardHolder || data.customerName,
      number: this.cleanDocument(data.cardNumber),
      expiryMonth: data.expiryMonth,
      expiryYear: data.expiryYear,
      ccv: data.securityCode,
    };

    payload.creditCardHolderInfo = {
      name: data.cardHolder || data.customerName,
      email: data.customerEmail,
      cpfCnpj: this.cleanDocument(data.customerDocument),
      postalCode: this.cleanDocument(data.postalCode || data.cep),
      addressNumber: data.number,
      phone: this.cleanDocument(data.customerPhone),
      mobilePhone: this.cleanDocument(data.customerPhone),
    };

    if (data.remoteIp || data.ipAddress) {
      payload.remoteIp = data.remoteIp || data.ipAddress;
    }
  }

  private formatResponse(paymentData: any, pixQrCode?: any): PaymentResponse {
    if (!paymentData) {
      return { externalId: '', rawResponse: {} };
    }

    return {
      externalId: paymentData.id || '',
      paymentUrl:
        paymentData.invoiceUrl ||
        paymentData.bankSlipUrl ||
        paymentData.transactionReceiptUrl ||
        undefined,
      pixQrCode:
        pixQrCode?.payload ||
        pixQrCode?.encodedImage ||
        paymentData.qrCode ||
        paymentData.pixQrCode ||
        undefined,
      status: this.mapStatus(paymentData.status),
      rawResponse: {
        ...paymentData,
        pixQrCode,
      },
    };
  }

  private formatAmount(amount: number): number {
    return Number(parseFloat(amount.toString()).toFixed(2));
  }

  private cleanDocument(doc: string | undefined): string | undefined {
    return doc?.replace(/\D/g, '');
  }

  private formatDate(dateInput: string | Date | undefined): string {
    try {
      const date = new Date(dateInput || new Date());
      return date.toISOString().split('T')[0];
    } catch {
      const date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }
  }

  private determinePaymentType(method: string | undefined): string {
    const normalized = method?.toUpperCase() ?? 'PIX';

    const map: Record<string, string> = {
      PIX: 'PIX',
      BOLETO: 'BOLETO',
      CREDIT_CARD: 'CREDIT_CARD',
    };

    return map[normalized] || 'PIX';
  }

  private mapStatus(status?: string): PaymentResponse['status'] {
    const normalized = String(status || '').toUpperCase();
    if (['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(normalized)) {
      return 'PAID';
    }
    if (['OVERDUE'].includes(normalized)) return 'EXPIRED';
    if (['REFUNDED', 'RECEIVED_IN_CASH_UNDONE', 'DELETED'].includes(normalized)) {
      return 'CANCELED';
    }
    return 'PENDING';
  }
}
