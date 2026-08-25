# Contrato WooCommerce Payvex

## Checkout WooCommerce -> Payvex

`POST <PAYVEX_API_URL>/transactions/plugin/create`

Headers:
- `Content-Type: application/json`
- `X-API-KEY: <API_KEY_PAYVEX>`
- `X-Payvex-Plugin: woocommerce/<version>`

Payload mínimo:

```json
{
  "amount": 10000,
  "currency": "BRL",
  "paymentMethod": "PIX",
  "gateway": "MERCADO_PAGO",
  "orderId": "1234",
  "returnUrl": "https://loja.com/checkout/order-received/1234",
  "customerEmail": "comprador@example.com",
  "customerName": "Comprador",
  "metadata": {
    "orderId": "1234",
    "woocommerceOrderId": "1234",
    "source": "woocommerce"
  }
}
```

`amount` deve ser enviado em centavos.

Resposta esperada:

```json
{
  "id": "external-id",
  "paymentUrl": "https://...",
  "pixQrCode": "000201...",
  "status": "PENDING"
}
```

## Registro Automático De Webhook

Ao salvar as configurações do plugin, ele registra automaticamente:

`PATCH <PAYVEX_API_URL>/identity/plugin/webhook`

```json
{
  "webhookUrl": "https://loja.com/wp-json/payvex/v1/webhook"
}
```

## Payvex -> WooCommerce

O Payvex dispara o callback cadastrado na API Key quando a transação muda de status.

Endpoint do plugin:

`POST https://loja.com/wp-json/payvex/v1/webhook`

Headers assinados:
- `X-Payvex-Signature: sha256=<hmac>`
- `X-Payvex-Timestamp: <timestamp>`
- `X-Payvex-Event: payment.approved | payment.failed | payment.expired | payment.canceled`

Assinatura:

```text
HMAC_SHA256(timestamp + "." + rawBody, webhookSecret)
```

O plugin usa o `webhookSecret` gerado junto com a API Key Payvex.

Mapeamento de status:
- `PAID` / `payment.approved`: chama `$order->payment_complete()`
- `FAILED` / `payment.failed`: pedido `failed`
- `EXPIRED` / `payment.expired`: pedido `cancelled`
- `CANCELED` / `payment.canceled`: pedido `cancelled`
- `PENDING` / `payment.pending`: pedido `on-hold`

## Payvex Backend -> WooCommerce

Quando o Payvex precisar criar um pedido diretamente no WooCommerce, o plugin expõe:

- `POST /wp-json/wc/v3/payvex/transactions`
- `POST /wp-json/wc/v3/payvex/transactions/{id}/refund`

Essas rotas usam autenticação REST do WooCommerce com Consumer Key e Consumer Secret.
