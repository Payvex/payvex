# Contrato Tecnico do Plugin WooCommerce

## Objetivo

Permitir que um plugin WooCommerce se conecte a Payvex usando uma `apiKey`
por loja/unidade, crie cobrancas e receba webhooks assinados de pagamento.

## Fluxo de instalacao

1. O lojista gera uma `apiKey` no painel Payvex e escolhe a filial.
2. O plugin salva essa `apiKey` no WordPress.
3. O plugin consulta os detalhes da instalacao em `GET /identity/plugin/me`.
4. O plugin registra sua URL de webhook em `PATCH /identity/plugin/webhook`.
5. O plugin cria cobrancas em `POST /transactions/plugin/create`.
6. A Payvex envia eventos assinados para a `webhookUrl` cadastrada.

## Autenticacao do plugin

Enviar um dos headers abaixo:

```http
X-API-Key: px_live_xxxxxxxxx
```

ou

```http
Authorization: Bearer px_live_xxxxxxxxx
```

## Endpoints do plugin

### `GET /identity/plugin/me`

Retorna dados basicos da instalacao atual.

### `PATCH /identity/plugin/webhook`

Configura a URL do webhook da instalacao.

Body:

```json
{
  "webhookUrl": "https://loja.com/wp-json/payvex/v1/webhook"
}
```

### `POST /transactions/plugin/create`

Cria uma cobranca usando a `apiKey` da loja.

Body:

```json
{
  "amount": 129.9,
  "paymentMethod": "PIX",
  "gateway": "STRIPE",
  "filialId": "filial_123",
  "customerName": "Joao Silva",
  "customerEmail": "joao@email.com",
  "metadata": {
    "orderId": 1234,
    "orderKey": "wc_order_abcd1234",
    "siteUrl": "https://loja.com"
  }
}
```

## Webhooks enviados pela Payvex

Eventos iniciais:

- `payment.approved`
- `payment.failed`
- `payment.expired`
- `payment.canceled`

Headers enviados:

```http
X-Payvex-Signature: sha256=<hash>
X-Payvex-Timestamp: 1710000000000
X-Payvex-Event: payment.approved
X-Payvex-Delivery: 550e8400-e29b-41d4-a716-446655440000
```

Base assinada:

```txt
<timestamp>.<raw-json-payload>
```

Algoritmo:

- `HMAC-SHA256`

## Correlacao com pedidos WooCommerce

O plugin deve enviar identificadores do pedido no campo `metadata`.

Campos recomendados:

- `metadata.orderId`
- `metadata.orderKey`
- `metadata.siteUrl`

Esses mesmos dados retornam no webhook dentro de `data.metadata`, permitindo
localizar o pedido com maior confiabilidade do que apenas por IDs da transacao.
