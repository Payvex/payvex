# Payvex SDK

SDK TypeScript para integrar sistemas externos a Payvex sem instalar um plugin de e-commerce.

## Instalar

```bash
npm install @payvex/sdk
```

## Criar uma transacao

```ts
import { Payvex } from "@payvex/sdk";

const payvex = new Payvex({
  apiKey: process.env.PAYVEX_API_KEY!,
  baseUrl: "https://api.payvex.com",
});

const transaction = await payvex.transactions.create({
  amount: 10000,
  currency: "BRL",
  gateway: "ASAAS",
  paymentMethod: "PIX",
  orderId: "pedido-123",
  customer: {
    name: "Maria Silva",
    email: "maria@loja.com",
    document: "12345678900",
  },
  metadata: {
    source: "erp",
  },
});
```

## Consultar status

```ts
const transaction = await payvex.transactions.get("pay_gateway_external_id");
```

## Validar webhook recebido da Payvex

```ts
import { verifyPayvexWebhook } from "@payvex/sdk";

const event = await verifyPayvexWebhook({
  rawBody,
  headers: req.headers,
  webhookSecret: process.env.PAYVEX_WEBHOOK_SECRET!,
});
```

O SDK valida:

- `X-Payvex-Signature`
- `X-Payvex-Timestamp`
- assinatura HMAC SHA-256
- tolerancia contra replay
