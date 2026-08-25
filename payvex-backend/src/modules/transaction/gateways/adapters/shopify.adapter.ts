import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentGateway, PaymentResponse } from '../payment-gateway.interface';

type ShopifyCredentials = {
  apiVersion?: string;
  baseUrl: string;
  accessToken: string;
  shop?: string;
};

@Injectable()
export class ShopifyAdapter implements PaymentGateway {
  private baseUrl: string;
  private accessToken: string;
  private shop: string;
  private apiVersion: string;

  constructor() {}

  connect(config: {
    shopifyUrl: string;
    shopifyAccessToken: string;
    shopifyStoreId: string;
    shopifyApiVersion?: string;
  }): void {
    this.baseUrl = config.shopifyUrl;
    this.accessToken = config.shopifyAccessToken;
    this.shop = config.shopifyStoreId;
    this.apiVersion = config.shopifyApiVersion || '2026-07';

    if (!this.baseUrl || !this.accessToken || !this.shop) {
      throw new BadRequestException('Configurações do Shopify incompletas');
    }
  }

  disconnect(): void {
    this.baseUrl = '';
    this.accessToken = '';
    this.shop = '';
    this.apiVersion = '';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.accessToken,
    };
  }

  private async makeRequest(
    endpoint: string,
    method: string = 'GET',
    body?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}/admin/api/${this.apiVersion}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new BadRequestException(`Erro na API Shopify: ${response.status}`);
    }

    return response.json();
  }

  async createPayment(orderData: any, credentials?: any): Promise<PaymentResponse> {
    if (credentials?.baseUrl || credentials?.url) {
      this.connect({
        shopifyUrl: credentials.baseUrl || credentials.url,
        shopifyAccessToken: credentials.accessToken,
        shopifyStoreId: credentials.shop || credentials.storeId,
        shopifyApiVersion: credentials.apiVersion,
      });
    }

    const lineItems =
      orderData.lineItems?.map((item: any) => ({
        title: item.title || item.name || orderData.itemName || 'Pedido Payvex',
        price: String(item.price || orderData.amount || 0),
        quantity: item.quantity || 1,
      })) || [
        {
          title: orderData.itemName || orderData.description || 'Pedido Payvex',
          price: String(orderData.amount || 0),
          quantity: orderData.quantity || 1,
        },
      ];

    const draft = await this.makeRequest('/draft_orders.json', 'POST', {
      draft_order: {
        line_items: lineItems,
        email: orderData.customerEmail,
        currency: orderData.currency || 'BRL',
        note: orderData.description || 'Pedido criado via Payvex',
        tags: 'payvex',
      },
    });

    const draftOrder = draft?.draft_order;
    return {
      externalId: String(draftOrder?.id || orderData.payvexReference || ''),
      paymentUrl: draftOrder?.invoice_url,
      rawResponse: draft,
      status: 'PENDING',
    };
  }

  async validate(credentials: {
    apiVersion?: string;
    baseUrl: string;
    accessToken: string;
    shop: string;
  }): Promise<boolean> {
    if (!credentials.baseUrl || !credentials.accessToken) {
      return false;
    }

    try {
      const apiVersion = credentials.apiVersion || '2026-07';
      const response = await fetch(
        `${credentials.baseUrl.replace(/\/+$/, '')}/admin/api/${apiVersion}/shop.json`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': credentials.accessToken,
          },
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async registerWebhook(
    credentials: ShopifyCredentials,
    topic: string,
    address: string,
  ) {
    const apiVersion = credentials.apiVersion || '2026-07';
    const baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    const headers = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': credentials.accessToken,
    };

    const existing = await fetch(
      `${baseUrl}/admin/api/${apiVersion}/webhooks.json?topic=${encodeURIComponent(topic)}`,
      { headers },
    );

    if (existing.ok) {
      const body = await existing.json();
      const match = body?.webhooks?.find(
        (webhook: any) => webhook?.topic === topic && webhook?.address === address,
      );
      if (match) return match;
    }

    const response = await fetch(
      `${baseUrl}/admin/api/${apiVersion}/webhooks.json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          webhook: {
            topic,
            address,
            format: 'json',
          },
        }),
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Erro ao registrar webhook Shopify ${topic}: ${response.status}`,
      );
    }

    return response.json();
  }

  async registerDefaultWebhooks(
    credentials: ShopifyCredentials & { filialId: string },
  ) {
    const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '');
    if (!backendUrl) return [];

    const topics = ['orders/paid', 'orders/cancelled', 'app/uninstalled'];
    const results: any[] = [];

    for (const topic of topics) {
      const address = `${backendUrl}/webhooks/shopify?filialId=${encodeURIComponent(
        credentials.filialId,
      )}`;
      results.push(await this.registerWebhook(credentials, topic, address));
    }

    return results;
  }

  async refund(orderId: string, amount?: number): Promise<any> {
    // Shopify usa refunds para devoluções
    const refundData: any = { refund: {} };

    if (amount) {
      refundData.refund.amount = amount;
    }

    return await this.makeRequest(
      `/orders/${orderId}/refunds.json`,
      'POST',
      refundData,
    );
  }
}
