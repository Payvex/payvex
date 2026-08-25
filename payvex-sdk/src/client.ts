import { PayvexApiError } from "./errors";
import type {
  CreateTransactionInput,
  PayvexConfig,
  PayvexTransaction,
} from "./types";
import { verifyPayvexWebhook } from "./webhooks";

const DEFAULT_BASE_URL = "https://api.payvex.com";
const DEFAULT_TIMEOUT_MS = 15000;

export class Payvex {
  readonly transactions: TransactionsResource;
  readonly webhooks = {
    verify: verifyPayvexWebhook,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;

  constructor(config: PayvexConfig) {
    if (!config.apiKey) {
      throw new Error("Payvex apiKey e obrigatoria.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.fetcher = config.fetcher || fetch;
    this.transactions = new TransactionsResource(this);
  }

  async request<TResponse>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const payload = await readJson(response);

      if (!response.ok) {
        throw new PayvexApiError(
          extractErrorMessage(payload) || `Payvex request failed with ${response.status}.`,
          response.status,
          payload,
        );
      }

      return payload as TResponse;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export class TransactionsResource {
  constructor(private readonly client: Payvex) {}

  create(input: CreateTransactionInput) {
    return this.client.request<PayvexTransaction>(
      "POST",
      "/transactions/plugin/create",
      normalizeCreateInput(input),
    );
  }

  get(externalId: string) {
    return this.client.request<PayvexTransaction>(
      "GET",
      `/transactions/plugin/${encodeURIComponent(externalId)}`,
    );
  }
}

function normalizeCreateInput(input: CreateTransactionInput): Record<string, unknown> {
  return {
    amount: input.amount,
    currency: input.currency || "BRL",
    paymentMethod: input.paymentMethod,
    gateway: input.gateway,
    orderId: input.orderId,
    description: input.description,
    returnUrl: input.returnUrl,
    webhookUrl: input.webhookUrl,
    expirationDate: input.expirationDate,
    customerName: input.customer?.name,
    customerEmail: input.customer?.email,
    customerDocument: input.customer?.document,
    customerPhone: input.customer?.phone,
    installments: input.card?.installments,
    cardNumber: input.card?.cardNumber,
    securityCode: input.card?.securityCode,
    expiryMonth: input.card?.expiryMonth,
    expiryYear: input.card?.expiryYear,
    cardHolder: input.card?.cardHolder,
    cardToken: input.card?.cardToken,
    encryptedCard: input.card?.encryptedCard,
    capture: input.card?.capture,
    statementDescriptor: input.card?.statementDescriptor,
    street: input.billingAddress?.street,
    number: input.billingAddress?.number,
    complement: input.billingAddress?.complement,
    neighborhood: input.billingAddress?.neighborhood,
    city: input.billingAddress?.city,
    regionCode: input.billingAddress?.regionCode,
    postalCode: input.billingAddress?.postalCode,
    cep: input.billingAddress?.cep,
    cryptoCurrency: input.cryptoCurrency,
    cancelUrl: input.cancelUrl,
    metadata: input.metadata,
  };
}

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as { message?: unknown; error?: unknown };
  if (typeof candidate.message === "string") {
    return candidate.message;
  }

  if (Array.isArray(candidate.message)) {
    return candidate.message.join(", ");
  }

  if (typeof candidate.error === "string") {
    return candidate.error;
  }

  return null;
}
