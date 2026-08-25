# Payvex — Diagnóstico, Design Spec e Plano

> Estado: branch `develop` em `2026-08-22`
> Objetivo: transformar o Payvex em um MVP comercial estável de unificação de gateways.

---

## 1. Resumo executivo

O projeto já tem uma base funcional sólida:
- multitenancy por `Company` → `Filial` → `User`
- factory de gateways com Stripe e Mercado Pago
- criação de transações, stats, webhooks de saída e recebimento Stripe
- plugin WooCommerce inicial
- painel admin com identidade visual redesenhada

O maior gargalo atual é o **Mercado Pago**: o adapter está implementado mas com limitações funcionais e risco de falha em produção. Depois dele, o plugin WooCommerce ainda é um esqueleto.

---

## 2. O que está implementado

### Backend `payvex-backend`
- Auth JWT + guards + middleware
- Multitenancy com roles `ADMIN`/`USER`
- AES-256 BYOK + descriptografia centralizada
- Factory `PaymentGateway` + adapters `StripeAdapter` e `MercadoPagoAdapter`
- CRUD de transações + stats + chart
- Limites por plano (`Subscription`)
- Webhooks:
  - Recebimento Stripe via BullMQ/Redis
  - Envio de eventos Payvex → plugins com `WebhookLog`
  - Asaas webhook para subscription
- API pública para plugins (`GET /identity/plugin/me`, `PATCH /identity/plugin/webhook`)
- Prisma schema com `Transaction`, `WebhookLog`, `Subscription`, `Filial`, `ApiKey`
- Migração manual para campos WooCommerce + test mode MP

### Frontend `payvex-web`
- Login/register redesignados
- Admin protegido: dashboard, payments, transactions, integrations, company, subscriptions, docs, profile, ecommerce
- Integrations: cards por gateway + modal unificado
- Payments: formulário de cobrança com filial/gateway/método
- Ecommerce/Developers: API keys, plugins list, docs
- Proteção de rotas por middleware

### Plugin WooCommerce
- Admin settings page
- Gateway PIX inicial
- Test connection + register webhook
- Receiver de webhook com validação de assinatura
- Contrato técnico documentado

---

## 3. Riscos e gaps atuais

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Mercado Pago usa `checkout/preferences` (link) em vez de pagamento direto com QR PIX | Baixa conversão no checkout PIX | Alta |
| Código duplicado/sujeira no `mercado-pago.adapter.ts` | Risco de falha em runtime | Alta |
| Sem webhook receptor do Mercado Pago | Status não atualiza automaticamente | Alta |
| Plugin WooCommerce sem controller `POST /transactions/plugin/create` funcional | Plugin não cria cobranças reais | Alta |
| Pagar.me, Cielo, PicPay são apenas placeholders | Nenhum backend funcional | Média |
| Sem página de visualização de `WebhookLog` | Sem observabilidade de webhooks | Média |
| Sem rate limiting / validação hardening | Risco de abuso | Média |

---

## 4. Especificação de design alvo

### 4.1 Objetivo do produto
Unificar gateways de pagamento para empresas/lojas via **unidades/filiais BYOK**, com painel admin, checkout gerado, plugins e-commerce e webhooks assinados.

### 4.2 Princípios
- **Segurança primeiro:** chaves nunca expostas ao front; AES-256; webhook signing obrigatório.
- **Multitenancy real:** tudo por `companyId` + `filialId`.
- **Plugins como cidadãos de primeira classe:** API pública separada, autenticada por `ApiKey`, documentada.
- **Gateway-agnóstico:** factory + interface `PaymentGateway`; novo gateway = 1 adapter + 1 card UI.

### 4.3 Modelo de dados canônico
- `Company`: tenant raiz
- `Filial`: unidade + credenciais por gateway + configs e-commerce
- `User`: papel por empresa
- `ApiKey`: chave pública para plugins, com webhook config
- `Transaction`: cobrança normalizada, `gateway`, `externalId`, `paymentUrl`, `pixQrCode`, `status`, `metadata`
- `WebhookLog`: auditoria de envio/recebimento
- `Subscription`: plano, limites, status

### 4.4 Fluxo principal
1. Admin cria filial + configura chaves no `/integrations`.
2. Admin cria `ApiKey` para plugin.
3. Plugin WooCommerce usa a API Key para registrar webhook e criar cobranças.
4. Backend roteia para adapter; salva `Transaction`.
5. Webhooks dos providers atualizam status.
6. Payvex dispara webhook assinado para o plugin.

---

## 5. Plano de execução

### Fase A — Estabilizar Mercado Pago (atual)
1. Revisar `mercado-pago.adapter.ts`:
   - remover código duplicado/sujeira
   - implementar pagamento direto PIX via `/v1/payments` quando possível
   - mapear `pixQrCode` e `paymentUrl` na resposta
   - suportar test mode via header/sandbox
2. Criar webhook receptor do Mercado Pago (`POST /webhooks/mercadopago`) para atualizar `Transaction.status`.
3. Ajustar UI do modal Mercado Pago para mostrar test mode.

### Fase B — Completar plugin WooCommerce
1. Implementar controller público `POST /transactions/plugin/create` com `ApiKeyAuthGuard`.
2. Finalizar plugin:
   - criar cobrança real no checkout
   - processar webhook recebido e atualizar pedido
   - suportar múltiplos métodos via metadata/gateway
3. Atualizar contrato docs.

### Fase C — Preparar próximos gateways
1. Documentar interface mínima de adapter.
2. Manter UI Pagar.me/Cielo/PicPay como “Em Breve” até ter backend.

### Fase D — Observabilidade
1. Página `/admin/webhooks` com lista de `WebhookLog`.
2. Filtros por provider, status, filial.

### Fase E — Segurança/hardening
1. Rate limiting em `/transactions/create`.
2. Validação forte nos DTOs.
3. Remover logs sensíveis em produção.

### Fase F — Deploy/runbook
1. Variáveis de ambiente documentadas.
2. Migrações Prisma + docker-compose.
3. Healthcheck.
