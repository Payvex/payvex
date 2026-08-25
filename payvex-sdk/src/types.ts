export type PayvexGateway =
  | "STRIPE"
  | "MERCADO_PAGO"
  | "PAGARME"
  | "PAG_BANK"
  | "ASAAS"
  | "CIELO"
  | "STONE"
  | "PAGSEGURO"
  | "PICPAY"
  | "NOWPAYMENTS"
  | "COINBASE_COMMERCE"
  | "BITPAY";

export type PayvexPaymentMethod =
  | "PIX"
  | "BOLETO"
  | "CREDIT_CARD"
  | "CRYPTO";

export type PayvexTransactionStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELED";

export interface PayvexConfig {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export interface PayvexCustomer {
  name?: string;
  email?: string;
  document?: string;
  phone?: string;
}

export interface PayvexCard {
  cardNumber?: string;
  securityCode?: string;
  expiryMonth?: string;
  expiryYear?: string;
  cardHolder?: string;
  cardToken?: string;
  encryptedCard?: string;
  installments?: number;
  capture?: boolean;
  statementDescriptor?: string;
}

export interface PayvexAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  regionCode?: string;
  postalCode?: string;
  cep?: string;
}

export interface CreateTransactionInput {
  amount: number;
  currency?: string;
  paymentMethod: PayvexPaymentMethod;
  gateway?: PayvexGateway | string;
  orderId?: string;
  description?: string;
  returnUrl?: string;
  webhookUrl?: string;
  expirationDate?: string;
  customer?: PayvexCustomer;
  card?: PayvexCard;
  billingAddress?: PayvexAddress;
  shippingAddress?: PayvexAddress;
  cryptoCurrency?: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PayvexTransaction {
  id: string | null;
  externalId?: string;
  amount?: string | number;
  currency?: string;
  status: PayvexTransactionStatus | string;
  paymentMethod?: PayvexPaymentMethod | string;
  gateway?: string;
  paymentUrl?: string | null;
  pixQrCode?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerDocument?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayvexWebhookEvent<TData = Record<string, unknown>> {
  event: string;
  data: TData;
}

export type PayvexHeaders =
  | Headers
  | Record<string, string | string[] | undefined>;
