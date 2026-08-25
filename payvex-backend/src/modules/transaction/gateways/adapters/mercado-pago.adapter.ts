/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

export class MercadoPagoAdapter implements PaymentGateway {
  private readonly baseUrl = 'https://api.mercadopago.com';

  async createPayment(
    data: any,
    credentials: { secretKey?: string; accessToken?: string },
  ): Promise<PaymentResponse> {
    const accessToken = credentials.secretKey || credentials.accessToken;
    if (!accessToken) {
      throw new BadRequestException(
        'Access token do Mercado Pago não informado.',
      );
    }

    try {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('Valor da transação inválido.');
      }

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      if (data.paymentMethod === 'PIX' || data.paymentMethod === 'BOLETO') {
        return await this.createDirectPayment(data, headers);
      }

      return await this.createCheckoutPreference(data, headers);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Falha ao processar pagamento no Mercado Pago.';
      throw new BadRequestException(`[Mercado Pago Gateway Error]: ${message}`);
    }
  }

  private async createDirectPayment(
    data: any,
    headers: Record<string, string>,
  ): Promise<PaymentResponse> {
    const name = data.customerName || 'Venda Online';
    const names = name.split(' ');
    const payer: Record<string, any> = {
      email: data.customerEmail,
    };

    if (names.length > 0) {
      payer.first_name = names[0];
      payer.last_name = names.slice(1).join(' ');
    }

    if (data.customerDocument) {
      payer.identification = {
        type: 'CPF',
        number: data.customerDocument.replace(/\D/g, ''),
      };
    }

    const payload: Record<string, any> = {
      transaction_amount: Number(data.amount),
      description: `Cobrança Payvex - ${name}`,
      payment_method_id: data.paymentMethod === 'PIX' ? 'pix' : 'bolbradesco',
      payer,
      external_reference: data.payvexReference,
      notification_url: this.buildNotificationUrl(data),
    };

    if (data.paymentMethod === 'BOLETO') {
      payload.date_of_expiration = new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    const { data: payment } = await axios.post(
      `${this.baseUrl}/v1/payments`,
      payload,
      {
        headers: {
          ...headers,
          'X-Idempotency-Key': data.payvexReference || randomUUID(),
        },
      },
    );

    const pixQrCode =
      data.paymentMethod === 'PIX'
        ? payment.point_of_interaction?.transaction_data?.qr_code ||
          payment.qr_code
        : undefined;

    const paymentUrl =
      data.paymentMethod === 'PIX'
        ? payment.point_of_interaction?.transaction_data?.qr_code_image ||
          payment.qr_code_image
        : payment.transaction_details?.external_resource_url || undefined;

    return {
      externalId: String(payment.id),
      paymentUrl,
      pixQrCode,
      rawResponse: payment,
    };
  }

  private async createCheckoutPreference(
    data: any,
    headers: Record<string, string>,
  ): Promise<PaymentResponse> {
    const payload: Record<string, any> = {
      items: [
        {
          title: `Cobrança Payvex - ${data.customerName || 'Venda Online'}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(data.amount),
        },
      ],
      payer: {
        email: data.customerEmail,
        name: data.customerName,
      },
      back_urls: {
        success:
          data.returnUrl ||
          process.env.MERCADO_PAGO_SUCCESS_URL ||
          process.env.FRONTEND_URL ||
          undefined,
        failure:
          data.cancelUrl ||
          process.env.MERCADO_PAGO_FAILURE_URL ||
          process.env.FRONTEND_URL ||
          undefined,
        pending:
          data.pendingUrl ||
          process.env.MERCADO_PAGO_PENDING_URL ||
          process.env.FRONTEND_URL ||
          undefined,
      },
      auto_return: 'approved',
      metadata: {
        filialId: data.filialId,
        payvexReference: data.payvexReference,
      },
      external_reference: data.payvexReference,
      notification_url: this.buildNotificationUrl(data),
    };

    if (data.customerDocument) {
      payload.payer.identification = {
        type: 'cpf',
        number: data.customerDocument.replace(/\D/g, ''),
      };
    }

    const { data: preference } = await axios.post(
      `${this.baseUrl}/checkout/preferences`,
      payload,
      { headers },
    );

    const paymentUrl = preference.init_point || preference.sandbox_init_point;

    if (!paymentUrl) {
      throw new BadRequestException(
        'Não foi possível obter o link de pagamento do Mercado Pago.',
      );
    }

    return {
      externalId: String(preference.id),
      paymentUrl,
      rawResponse: preference,
    };
  }

  private buildNotificationUrl(data: any): string | undefined {
    const baseUrl =
      process.env.MERCADO_PAGO_WEBHOOK_URL ||
      process.env.BACKEND_URL;

    if (!baseUrl) return undefined;

    const url = new URL(
      baseUrl.includes('/webhooks/mercadopago')
        ? baseUrl
        : `${baseUrl.replace(/\/+$/, '')}/webhooks/mercadopago`,
    );

    if (data.filialId) {
      url.searchParams.set('filialId', data.filialId);
    }

    return url.toString();
  }
}
