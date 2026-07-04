# Payvex for WooCommerce

Plugin inicial para conectar uma loja WooCommerce ao backend da Payvex.

## O que este esqueleto faz

- adiciona uma tela de configuracao no painel WordPress
- salva `api_base_url`, `api_key` e `webhook_secret`
- testa a conexao com `GET /identity/plugin/me`
- registra o webhook com `PATCH /identity/plugin/webhook`
- cria o endpoint `wp-json/payvex/v1/webhook`
- valida a assinatura `X-Payvex-Signature`
- adiciona um gateway inicial `Payvex PIX` no WooCommerce
- cria cobranca em `POST /transactions/plugin/create`
- marca o pedido como pago quando recebe `payment.approved`
- atualiza o pedido para falha, expiracao e cancelamento via webhook
- mostra um bloco de pagamento no pedido com status, link e copia do codigo PIX

## Instalacao local

1. Copie a pasta `plugins/payvex-woocommerce` para `wp-content/plugins/payvex-woocommerce`
2. Ative o plugin no WordPress
3. Abra `Payvex` no menu lateral do admin
4. Configure:
   - URL da API Payvex
   - API Key
   - Webhook Secret
5. Clique em `Testar conexao`
6. Clique em `Registrar webhook`

## Endpoint de webhook do plugin

```txt
/wp-json/payvex/v1/webhook
```

## Proximo passo recomendado

Implementar a integracao com pedidos do WooCommerce:

- criar cobranca ao finalizar checkout
- expandir o suporte para mais eventos e conciliacao
- exibir QR Code visual e campos de expiracao no checkout
