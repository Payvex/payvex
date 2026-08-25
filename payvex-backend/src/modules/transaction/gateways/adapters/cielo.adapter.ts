/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type CieloCredentials = {
  merchantId?: string;
  merchantKey?: string;
  sandbox?: boolean;
};

export class CieloAdapter implements PaymentGateway {
  async createPayment(
    data: any,
    credentials: CieloCredentials,
  ): Promise<PaymentResponse> {
    if (!credentials.merchantId || !credentials.merchantKey) {
      throw new BadRequestException(
        'Credenciais Cielo não configuradas (MerchantId e MerchantKey obrigatórios).',
      );
    }

    try {
      const environment = credentials.sandbox
        ? 'https://apisandbox.cieloecommerce.cielo.com.br'
        : 'https://api.cieloecommerce.cielo.com.br';
      const headers = {
        'Content-Type': 'application/json',
        MerchantId: credentials.merchantId,
        MerchantKey: credentials.merchantKey,
      };

      const payload = this.buildSalePayload(data);
      const response = await axios.post(`${environment}/1/sales`, payload, {
        headers,
      });

      return this.formatResponse(response.data);
    } catch (error: any) {
      const message = this.extractErrorMessage(error);
      throw new BadRequestException(`[Cielo Gateway Error]: ${message}`);
    }
  }

  private buildSalePayload(data: any): Record<string, any> {
    const paymentMethod = String(data.paymentMethod || 'CREDIT_CARD').toUpperCase();
    const amount = this.formatAmount(data.amount);

    return {
      MerchantOrderId: this.merchantOrderId(
        data.payvexReference || data.orderId,
      ),
      Customer: this.buildCustomer(data),
      Payment: this.buildPayment(data, paymentMethod, amount),
    };
  }

  private buildCustomer(data: any): Record<string, any> {
    const document = this.cleanDocument(data.customerDocument);
    const customer: Record<string, any> = {
      Name: data.customerName || 'Cliente Payvex',
      Email: data.customerEmail,
    };

    if (document) {
      customer.Identity = document;
      customer.IdentityType = document.length > 11 ? 'CNPJ' : 'CPF';
    }

    const address = this.buildAddress(data);
    if (address) customer.Address = address;

    return customer;
  }

  private buildPayment(
    data: any,
    paymentMethod: string,
    amount: number,
  ): Record<string, any> {
    if (paymentMethod === 'PIX') {
      return {
        Type: 'Pix',
        Amount: amount,
        Provider: data.provider || 'Cielo',
      };
    }

    if (paymentMethod === 'BOLETO') {
      return {
        Type: 'Boleto',
        Amount: amount,
        Provider: data.boletoProvider || process.env.CIELO_BOLETO_PROVIDER || 'BancoDoBrasil3',
        Address: this.buildRequiredBoletoAddress(data),
        BoletoNumber: String(data.boletoNumber || Date.now()).slice(-9),
        Assignor: data.assignor || 'Payvex',
        Demonstrative: data.description || 'Pagamento Payvex',
        ExpirationDate: this.resolveDueDate(data.dueDate || data.expirationDate),
        Identification: this.cleanDocument(data.customerDocument),
        Instructions: data.instructions || 'Nao receber apos o vencimento',
      };
    }

    if (paymentMethod === 'CREDIT_CARD') {
      return {
        Type: 'CreditCard',
        Amount: amount,
        Installments: Number(data.installments || 1),
        Capture: data.capture !== undefined ? !!data.capture : true,
        SoftDescriptor: this.softDescriptor(data.statementDescriptor || data.description),
        CreditCard: this.buildCreditCard(data),
      };
    }

    throw new BadRequestException(`Método ${paymentMethod} não suportado na Cielo.`);
  }

  private buildCreditCard(data: any): Record<string, any> {
    const paymentToken = data.paymentToken || data.cardToken || data.cardId;
    if (paymentToken) {
      return {
        CardToken: paymentToken,
        SecurityCode: data.securityCode,
        Brand: data.cardBrand || data.brand || 'Visa',
      };
    }

    if (!data.cardNumber || !data.expiryMonth || !data.expiryYear) {
      throw new BadRequestException(
        'Cielo cartão exige cardNumber, expiryMonth e expiryYear ou um paymentToken/cardToken.',
      );
    }

    return {
      CardNumber: this.cleanDocument(data.cardNumber),
      Holder: data.customerName || data.cardHolder || 'Cliente Payvex',
      ExpirationDate: `${data.expiryMonth}/${data.expiryYear}`,
      SecurityCode: data.securityCode,
      Brand: data.cardBrand || data.brand || 'Visa',
      SaveCard: !!data.saveCard,
    };
  }

  private buildAddress(data: any): Record<string, any> | undefined {
    const zip = this.cleanDocument(data.zip || data.zipCode || data.postalCode || data.cep);
    if (!data.street && !data.city && !zip) return undefined;

    return {
      Street: data.street,
      Number: data.number,
      Complement: data.complement,
      ZipCode: zip,
      City: data.city,
      State: data.state || data.regionCode,
      Country: 'BRA',
      District: data.neighborhood || data.locality,
    };
  }

  private buildRequiredBoletoAddress(data: any): string {
    const address = this.buildAddress(data);
    if (!address?.Street || !address?.Number || !address?.City || !address?.State || !address?.ZipCode) {
      throw new BadRequestException(
        'Cielo boleto exige endereço do pagador: street, number, city, state/regionCode e postalCode/cep.',
      );
    }

    return [
      address.Street,
      address.Number,
      address.Complement,
      address.District,
      address.City,
      address.State,
      address.ZipCode,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private formatResponse(paymentData: any): PaymentResponse {
    const payment = paymentData?.Payment || {};

    return {
      externalId: payment.PaymentId || paymentData?.PaymentId || paymentData?.MerchantOrderId || '',
      paymentUrl:
        payment.Url ||
        payment.BoletoUrl ||
        payment.AuthenticationUrl ||
        undefined,
      pixQrCode:
        payment.QrCodeString ||
        payment.QrCodeBase64Image ||
        payment.QrCodeBase64 ||
        undefined,
      rawResponse: paymentData,
    };
  }

  private formatAmount(amount: number): number {
    return Math.round(Number(amount || 0) * 100);
  }

  private cleanDocument(doc: string | undefined): string | undefined {
    const cleaned = String(doc || '').replace(/\D/g, '');
    return cleaned || undefined;
  }

  private merchantOrderId(value?: string): string {
    return String(value || `payvex-${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50);
  }

  private resolveDueDate(dateInput?: string): string {
    if (dateInput) return dateInput.slice(0, 10);

    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString().slice(0, 10);
  }

  private softDescriptor(value?: string): string {
    return String(value || 'PAYVEX')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .slice(0, 13);
  }

  private extractErrorMessage(error: any): string {
    const validationErrors =
      error?.response?.data?.ValidationErrors ||
      error?.response?.data?.ValidationErrros;

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
      return validationErrors
        .map((item: any) => item?.Message || item?.Description)
        .filter(Boolean)
        .join(', ');
    }

    if (Array.isArray(error?.response?.data) && error.response.data.length > 0) {
      return error.response.data
        .map((item: any) => item?.Message || item?.Description)
        .filter(Boolean)
        .join(', ');
    }

    return (
      error?.response?.data?.Message ||
      error?.response?.data?.message ||
      error?.message ||
      'Falha ao processar pagamento na Cielo.'
    );
  }
}
