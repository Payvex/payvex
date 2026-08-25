/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileJson,
  KeyRound,
  LockKeyhole,
  PlugZap,
  Route,
  ShieldCheck,
  Store,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "react-hot-toast";

const gatewayDocs = [
  {
    name: "Stripe",
    status: "Pronto",
    methods: "Cartao",
    fields: [
      ["stripePublicKey", "Public Key", "pk_test_ / pk_live_"],
      ["stripeSecretKey", "Secret Key", "sk_test_ / sk_live_"],
      ["stripeWebhookSecret", "Webhook Signing Secret", "whsec_"],
    ],
    webhook: "/webhooks/stripe",
    note:
      "Webhook Secret e API Key sao credenciais diferentes. O secret vem do endpoint criado no painel de Webhooks da Stripe.",
    source: "https://docs.stripe.com/keys",
  },
  {
    name: "Mercado Pago",
    status: "Pronto",
    methods: "PIX, boleto, cartao",
    fields: [
      ["mercadoPagoAccessToken", "Access Token", "APP_USR-..."],
      ["mercadoPagoWebhookSecret", "Webhook Secret", "assinatura x-signature"],
    ],
    webhook: "/webhooks/mercadopago",
    note:
      "O Access Token autentica as chamadas. O webhook secret valida notificacoes quando configurado.",
    source: "https://www.mercadopago.com.br/developers/pt/docs",
  },
  {
    name: "Pagar.me",
    status: "Pronto",
    methods: "Cartao, PIX, boleto",
    fields: [
      ["pagarMeAccessToken", "Secret Key", "sk_test_ / sk_"],
      ["pagarMePublicKey", "Public Key", "pk_test_ / pk_"],
    ],
    webhook: "/webhooks/pagarme",
    note:
      "A Secret Key vai no Basic Auth como usuario e senha vazia, conforme a API v5.",
    source: "https://docs.pagar.me/reference/autentica%C3%A7%C3%A3o-2",
  },
  {
    name: "PagBank",
    status: "Pronto",
    methods: "PIX, boleto, cartao",
    fields: [
      ["pagarBankPrivateKey", "Token Bearer", "token do ambiente"],
      ["pagarBankSandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/pagbank",
    note:
      "O token de autenticacao muda entre sandbox e producao. A URL de notificacao deve apontar para o Payvex.",
    source: "https://developer.pagbank.com.br/docs/token-de-autenticacao",
  },
  {
    name: "Asaas",
    status: "Pronto",
    methods: "PIX, boleto, cartao",
    fields: [
      ["asaasApiKey", "API Key access_token", "$aact_hmlg_ / $aact_prod_"],
      ["asaasWebhookToken", "Token do Webhook", "header asaas-access-token"],
      ["asaasSandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/asaas/payments",
    note:
      "Asaas usa header access_token, nao Authorization Bearer. O token do webhook vem no header asaas-access-token.",
    source: "https://docs.asaas.com/docs/authentication",
  },
  {
    name: "Cielo",
    status: "Pronto",
    methods: "Cartao",
    fields: [
      ["cieloMerchantId", "Merchant ID", "identificador da loja"],
      ["cieloMerchantKey", "Merchant Key", "chave da loja"],
      ["cieloWebhookHeaderKey", "Header webhook", "ex: x-payvex-token"],
      ["cieloWebhookHeaderValue", "Valor header", "valor configurado"],
      ["cieloSandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/cielo",
    note:
      "A Cielo permite configurar header estatico para validar notificacoes de status.",
    source: "https://docs.cielo.com.br/ecommerce-cielo/reference/gerenciamento-de-credenciais",
  },
  {
    name: "Stone",
    status: "Pronto",
    methods: "Cartao",
    fields: [
      ["stoneApiKey", "Secret Key", "sk_..."],
      ["stoneClientId", "Client ID", "opcional"],
      ["stoneSecret", "Client Secret", "opcional"],
      ["stoneSandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/stone",
    note:
      "O adapter atual usa a chave secreta Stone Online para criar cobrancas por cartao.",
    source: "https://docs.pagar.me/docs/chaves-de-acesso",
  },
  {
    name: "PagSeguro",
    status: "Pronto",
    methods: "Checkout/PagSeguro",
    fields: [
      ["pagSeguroEmail", "E-mail da conta", "loja@exemplo.com"],
      ["pagSeguroToken", "Token da conta", "token"],
      ["pagSeguroSalt", "Salt", "opcional"],
      ["pagSeguroSandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/pagseguro",
    note:
      "As notificacoes legadas enviam notificationCode; o backend consulta a transacao usando e-mail e token.",
    source: "https://developer.pagbank.com.br/v1/docs/api-notificacao-v1",
  },
  {
    name: "PicPay",
    status: "Pronto",
    methods: "Carteira",
    fields: [
      ["picPayClientId", "Client ID", "credencial OAuth"],
      ["picPayClientSecret", "Client Secret", "exibido uma vez"],
      ["picPaySellerToken", "x-seller-token", "callback"],
      ["picPayPublicKey", "Token legado", "compatibilidade"],
    ],
    webhook: "/webhooks/picpay",
    note:
      "O client_secret deve ser guardado no momento da geracao. O x-seller-token valida callbacks do PicPay.",
    source: "https://developers-business.picpay.com/wallet/checkout/authentication",
  },
  {
    name: "NOWPayments",
    status: "Pronto",
    methods: "Cripto",
    fields: [
      ["nowPaymentsApiKey", "API Key", "x-api-key"],
      ["nowPaymentsIpnSecret", "IPN Secret", "secret do IPN"],
    ],
    webhook: "/webhooks/nowpayments",
    note:
      "O IPN Secret protege notificacoes de status de pagamentos cripto.",
    source: "https://nowpayments.io/help/what-is/what-is-ipn",
  },
  {
    name: "Coinbase Commerce",
    status: "Pronto",
    methods: "Cripto",
    fields: [
      ["coinbaseCommerceApiKey", "API Key", "Commerce API Key"],
      ["coinbaseCommerceWebhookSecret", "Webhook Secret", "shared secret"],
    ],
    webhook: "/webhooks/coinbase-commerce",
    note:
      "O webhook secret e usado para validar assinatura dos eventos de pagamento.",
    source: "https://docs.cdp.coinbase.com/coinbase-business/checkout-apis/webhooks",
  },
  {
    name: "BitPay",
    status: "Pronto",
    methods: "Cripto",
    fields: [
      ["bitPayToken", "POS Token", "token POS"],
      ["bitPaySandbox", "Sandbox", "true/false"],
    ],
    webhook: "/webhooks/bitpay",
    note:
      "BitPay envia IPN para notificationURL; o status deve ser confirmado pela invoice antes de cumprir pedido.",
    source: "https://developer.bitpay.com/docs/invoice-webhooks",
  },
];

const ecommerceDocs = [
  {
    name: "WooCommerce",
    status: "Plugin pronto",
    connector: "Plugin PHP Payvex",
    fields: ["URL da loja", "Consumer Key", "Consumer Secret"],
    insideStore: [
      "Instalar o plugin Payvex no WordPress.",
      "Ativar Payvex em WooCommerce > Pagamentos.",
      "Colar API URL, API Key px_live_ e Webhook Secret whsec_.",
      "Selecionar gateway e metodo de pagamento.",
      "Salvar para registrar o webhook automaticamente.",
    ],
    webhook: "https://loja.com/wp-json/payvex/v1/webhook",
    source: "https://developer.woocommerce.com/docs/apis/rest-api/authentication",
  },
  {
    name: "Shopify",
    status: "Bridge/OAuth pronto",
    connector: "Custom app ou OAuth App",
    fields: ["Dominio myshopify.com", "Access Token", "Store ID", "API Version"],
    insideStore: [
      "Criar app/custom app com Admin API access.",
      "Gerar access token com escopos de pedidos/draft orders/webhooks.",
      "Conectar pelo Payvex ou via OAuth.",
      "Usar payment app aprovado para checkout nativo.",
    ],
    webhook: "/webhooks/shopify?filialId=...",
    source: "https://shopify.dev/docs/api/admin-rest/latest/resources/webhook",
  },
  {
    name: "Nuvemshop",
    status: "Bridge/OAuth pronto",
    connector: "App Nuvemshop/Tiendanube",
    fields: ["Access Token", "Store ID", "Dominio para OAuth"],
    insideStore: [
      "Criar app no painel de parceiros.",
      "Conectar por OAuth ou token manual.",
      "Garantir User-Agent e escopos de pedido.",
      "Usar app de pagamento aprovado para checkout nativo.",
    ],
    webhook: "/webhooks/nuvem-shop?filialId=...",
    source: "https://tiendanube.github.io/api-documentation/authentication",
  },
];

const flowSteps = [
  ["1", "Gateway financeiro", "Configure Stripe, Asaas, Mercado Pago ou outro gateway na filial."],
  ["2", "API Key Payvex", "Gere a px_live_ e baixe o JSON com Webhook Secret whsec_."],
  ["3", "E-commerce", "Conecte WooCommerce, Shopify ou Nuvemshop no modal da tela de E-commerce."],
  ["4", "Checkout", "A loja chama /transactions/plugin/create usando X-API-KEY."],
  ["5", "Webhook de entrada", "O gateway confirma o pagamento em /webhooks/<provider>."],
  ["6", "Webhook de saida", "Payvex assina o evento e avisa a loja para atualizar o pedido."],
];

const incomingWebhooks = [
  ["Stripe", "/webhooks/stripe"],
  ["Mercado Pago", "/webhooks/mercadopago"],
  ["Asaas", "/webhooks/asaas/payments"],
  ["Pagar.me", "/webhooks/pagarme"],
  ["PagBank", "/webhooks/pagbank"],
  ["Cielo", "/webhooks/cielo"],
  ["Stone", "/webhooks/stone"],
  ["PagSeguro", "/webhooks/pagseguro"],
  ["PicPay", "/webhooks/picpay"],
  ["NOWPayments", "/webhooks/nowpayments"],
  ["Coinbase Commerce", "/webhooks/coinbase-commerce"],
  ["BitPay", "/webhooks/bitpay"],
];

const sampleCreate = `POST /transactions/plugin/create
X-API-KEY: px_live_...
Content-Type: application/json

{
  "amount": 10000,
  "currency": "BRL",
  "paymentMethod": "PIX",
  "gateway": "ASAAS",
  "orderId": "1234",
  "customerName": "Maria Silva",
  "customerEmail": "maria@loja.com",
  "metadata": {
    "source": "woocommerce",
    "orderId": "1234"
  }
}`;

const sampleOutgoing = `X-Payvex-Signature: sha256=<hmac>
X-Payvex-Timestamp: 1787612400000
X-Payvex-Event: payment.approved

{
  "event": "payment.approved",
  "data": {
    "externalId": "pay_123",
    "amount": 100,
    "status": "PAID",
    "metadata": {
      "orderId": "1234",
      "source": "woocommerce"
    }
  }
}`;

const credentialJson = `{
  "type": "payvex_service_account",
  "name": "woocommerce_matriz",
  "apiKey": "px_live_...",
  "webhookSecret": "whsec_...",
  "filialId": "filial_..."
}`;

const sdkInstall = `npm install @payvex/sdk

# ou usando pnpm
pnpm add @payvex/sdk`;

const sdkCreate = `import { Payvex } from "@payvex/sdk";

const payvex = new Payvex({
  apiKey: process.env.PAYVEX_API_KEY!,
  baseUrl: "https://api.payvex.com"
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
    document: "12345678900"
  },
  metadata: {
    source: "erp",
    cartId: "cart_789"
  }
});`;

const sdkStatus = `const transaction = await payvex.transactions.get("pay_gateway_external_id");

if (transaction.status === "PAID") {
  await markOrderAsPaid(transaction.metadata?.orderId);
}`;

const sdkWebhook = `import { verifyPayvexWebhook } from "@payvex/sdk";

app.post("/payvex/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const event = await verifyPayvexWebhook({
    rawBody: req.body.toString("utf8"),
    headers: req.headers,
    webhookSecret: process.env.PAYVEX_WEBHOOK_SECRET!
  });

  if (event.event === "payment.approved") {
    await fulfillOrder(event.data.metadata.orderId);
  }

  res.sendStatus(200);
});`;

const sdkCurl = `curl -X POST https://api.payvex.com/transactions/plugin/create \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: px_live_..." \\
  -d '{
    "amount": 10000,
    "currency": "BRL",
    "paymentMethod": "PIX",
    "gateway": "ASAAS",
    "orderId": "pedido-123"
  }'`;

const sdkUseCases = [
  ["ERP", "Gerar cobrancas e reconciliar pedidos financeiros sem plugin."],
  ["SaaS", "Cobrar assinatura ou fatura avulsa usando o gateway da filial."],
  ["Marketplace", "Criar pagamentos por vendedor, unidade ou filial."],
  ["App mobile", "Criar PIX, boleto ou cripto no backend e exibir o retorno no app."],
  ["Checkout custom", "Controlar a tela propria e deixar a Payvex orquestrar o gateway."],
  ["Backoffice", "Emitir segunda via, link de pagamento e acompanhar status."],
];

const sdkEndpoints = [
  ["POST", "/transactions/plugin/create", "Cria uma transacao usando X-API-KEY."],
  ["GET", "/transactions/plugin/:externalId", "Consulta uma transacao pelo ID externo do gateway."],
  ["Webhook", "X-Payvex-Signature", "Valida eventos enviados da Payvex para o sistema."],
];

type PlaygroundLanguage =
  | "typescript"
  | "node"
  | "python"
  | "csharp"
  | "java"
  | "ruby"
  | "go"
  | "php";

type PlaygroundConfig = {
  baseUrl: string;
  apiKey: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  gateway: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
};

const playgroundLanguages: Array<{
  key: PlaygroundLanguage;
  label: string;
  iconUrl: string;
}> = [
  {
    key: "node",
    label: "Node JavaScript",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg",
  },
  {
    key: "typescript",
    label: "TypeScript SDK",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg",
  },
  {
    key: "python",
    label: "Python",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg",
  },
  {
    key: "csharp",
    label: "C#",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg",
  },
  {
    key: "java",
    label: "Java",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg",
  },
  {
    key: "ruby",
    label: "Ruby",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg",
  },
  {
    key: "go",
    label: "Go",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original-wordmark.svg",
  },
  {
    key: "php",
    label: "PHP",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg",
  },
];

const defaultPlaygroundConfig: PlaygroundConfig = {
  baseUrl: "http://localhost:3001",
  apiKey: "",
  amount: "10000",
  currency: "BRL",
  paymentMethod: "PIX",
  gateway: "ASAAS",
  orderId: "pedido-123",
  customerName: "Maria Silva",
  customerEmail: "maria@loja.com",
};

export default function DocsPage() {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyBlock = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedBlock(label);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopiedBlock(null), 1800);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-10 pb-20">
        <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-surface">
              <BookOpen size={14} />
              Central de Documentacao
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-surface md:text-5xl">
              Integre loja, gateway e webhook sem adivinhar campos.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
              Esta pagina espelha o schema, os adapters e os modais reais da
              Payvex. Use como roteiro para configurar gateways, gerar API Key,
              instalar plugins e validar callbacks de pagamento.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Pill icon={<KeyRound size={14} />} label="px_live_ cria cobrancas" />
              <Pill icon={<ShieldCheck size={14} />} label="whsec_ valida callbacks" />
              <Pill icon={<Webhook size={14} />} label="webhooks por fila/status" />
            </div>
          </div>

          <SystemSnapshot />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {flowSteps.map(([step, title, description]) => (
            <div
              key={step}
              className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-black text-white">
                {step}
              </div>
              <h2 className="text-sm font-black uppercase text-surface">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <DocPanel
            icon={<FileJson size={22} />}
            eyebrow="Credenciais Payvex"
            title="API Key, Webhook Secret e JSON"
          >
            <div className="space-y-4 text-sm leading-7 text-slate-600">
              <p>
                A API Key `px_live_...` permite que o plugin/e-commerce crie
                transacoes no Payvex. O Webhook Secret `whsec_...` e usado pelo
                e-commerce para validar o webhook que o Payvex envia de volta.
              </p>
              <p>
                O botao de baixar JSON aparece no momento da criacao da chave,
                seguindo o padrao de consoles de API: depois disso o sistema
                mostra apenas preview, e para obter uma nova chave e preciso
                rotacionar.
              </p>
            </div>
          </DocPanel>
          <CodePanel
            label="credenciais.json"
            title="Arquivo baixado pelo Payvex"
            code={credentialJson}
            copied={copiedBlock === "Credenciais JSON"}
            onCopy={() => copyBlock("Credenciais JSON", credentialJson)}
          />
        </section>

        <section className="space-y-5">
          <SectionTitle
            icon={<PlugZap size={22} />}
            eyebrow="Gateways"
            title="Mapeamento de credenciais por provedor"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {gatewayDocs.map((gateway) => (
              <GatewayCard key={gateway.name} gateway={gateway} />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <SectionTitle
            icon={<Store size={22} />}
            eyebrow="E-commerce"
            title="Conectores de loja e passos dentro da plataforma"
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {ecommerceDocs.map((item) => (
              <EcommerceCard key={item.name} item={item} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <DocPanel
            icon={<Route size={22} />}
            eyebrow="Rotas de entrada"
            title="Para onde cada gateway envia webhook"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {incomingWebhooks.map(([name, path]) => (
                <div
                  key={path}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <p className="text-xs font-black uppercase text-surface">
                    {name}
                  </p>
                  <code className="mt-1 block text-[11px] text-slate-500">
                    {path}
                  </code>
                </div>
              ))}
            </div>
          </DocPanel>
          <WebhookSnapshot />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <CodePanel
            label="request"
            title="Criacao de transacao pelo plugin"
            code={sampleCreate}
            copied={copiedBlock === "Request"}
            onCopy={() => copyBlock("Request", sampleCreate)}
          />
          <CodePanel
            label="webhook"
            title="Evento Payvex entregue ao e-commerce"
            code={sampleOutgoing}
            copied={copiedBlock === "Webhook"}
            onCopy={() => copyBlock("Webhook", sampleOutgoing)}
          />
        </section>

        <section className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
          <SectionTitle
            icon={<ExternalLink size={22} />}
            eyebrow="Fontes"
            title="Documentacoes oficiais usadas como base"
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...gatewayDocs, ...ecommerceDocs].map((item) => (
              <a
                key={`${item.name}-${item.source}`}
                href={item.source}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-surface transition-colors hover:border-primary"
              >
                {item.name}
                <ExternalLink size={14} className="text-primary" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

export function DevelopersDocsPage() {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyBlock = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedBlock(label);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopiedBlock(null), 1800);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl space-y-10 pb-20">
        <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-[1.25rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-surface">
              <BookOpen size={14} />
              Payvex Developers
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-surface md:text-5xl">
              Integre qualquer sistema a Payvex com SDK e API REST.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 md:text-base">
              Use esta pagina para testar transacoes, copiar exemplos por
              linguagem e validar como seu ERP, SaaS, app ou checkout customizado
              conversa com a Payvex.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Pill icon={<KeyRound size={14} />} label="SDK para sistemas proprios" />
              <Pill icon={<ShieldCheck size={14} />} label="webhooks assinados" />
              <Pill icon={<Webhook size={14} />} label="playground integrado" />
            </div>
          </div>

          <SystemSnapshot />
        </section>

        <DeveloperSdkModule copiedBlock={copiedBlock} copyBlock={copyBlock} />
      </div>
    </PageTransition>
  );
}

function Pill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase text-surface">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function SectionTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[0.875rem] bg-primary/15 text-surface">
        {icon}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-black text-surface">{title}</h2>
      </div>
    </div>
  );
}

function DocPanel({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionTitle icon={icon} eyebrow={eyebrow} title={title} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

function CodePanel({
  label,
  title,
  code,
  copied,
  onCopy,
}: {
  label: string;
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-[#44475a] bg-[#282a36] shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#50fa7b]">
            {label}
          </p>
          <h3 className="text-base font-black text-[#f8f8f2]">{title}</h3>
        </div>
        <Button
          variant="outline"
          onClick={onCopy}
          className="rounded-xl border-[#6272a4]/40 bg-[#44475a] text-[#f8f8f2] hover:bg-[#bd93f9] hover:text-[#282a36]"
        >
          <Copy size={14} />
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-6 text-[13px] leading-6 text-[#f8f8f2]">
        <code>{renderDraculaCode(code)}</code>
      </pre>
    </div>
  );
}

function renderDraculaCode(code: string) {
  return code.split("\n").map((line, lineIndex) => (
    <span key={`${lineIndex}-${line}`}>
      {renderDraculaLine(line, lineIndex)}
      {lineIndex < code.split("\n").length - 1 ? "\n" : null}
    </span>
  ));
}

function renderDraculaLine(line: string, lineIndex: number) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|<\?php|\b(?:async|await|class|const|def|echo|else|false|from|func|if|import|let|namespace|new|nil|null|package|print|public|require|return|true|using|use|var|None|True|False|String|Dictionary|Environment|Console|System|Payvex|PayvexClient|CreateTransactionInput|CreateTransactionRequest|PayvexOptions|PayvexCustomer)\b|\b\d+(?:\.\d+)?\b)/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(line)) !== null) {
    if (match.index > cursor) {
      parts.push(line.slice(cursor, match.index));
    }

    const token = match[0];
    parts.push(
      <span
        key={`${lineIndex}-${match.index}-${token}`}
        className={getDraculaTokenClass(token)}
      >
        {token}
      </span>,
    );
    cursor = match.index + token.length;
  }

  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }

  return parts;
}

function getDraculaTokenClass(token: string) {
  if (token.startsWith("//") || token.startsWith("#")) {
    return "text-[#6272a4]";
  }

  if (
    token.startsWith("\"") ||
    token.startsWith("'") ||
    token.startsWith("`")
  ) {
    return "text-[#f1fa8c]";
  }

  if (/^\d/.test(token)) {
    return "text-[#bd93f9]";
  }

  if (
    [
      "Payvex",
      "PayvexClient",
      "CreateTransactionInput",
      "CreateTransactionRequest",
      "PayvexOptions",
      "PayvexCustomer",
      "Environment",
      "Console",
      "System",
      "String",
      "Dictionary",
    ].includes(token)
  ) {
    return "text-[#8be9fd]";
  }

  return "text-[#ff79c6]";
}

function GatewayCard({ gateway }: { gateway: any }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-surface">{gateway.name}</h3>
            <Badge className="rounded-full bg-emerald-100 text-emerald-700">
              {gateway.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs font-bold uppercase text-slate-400">
            {gateway.methods}
          </p>
        </div>
        <code className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
          {gateway.webhook}
        </code>
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Campo Payvex</th>
              <th className="px-4 py-3">Chave no provedor</th>
              <th className="px-4 py-3">Formato</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gateway.fields.map(([field, label, example]: string[]) => (
              <tr key={field}>
                <td className="px-4 py-3">
                  <code className="text-xs font-bold text-surface">{field}</code>
                </td>
                <td className="px-4 py-3 text-slate-600">{label}</td>
                <td className="px-4 py-3 text-slate-500">{example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-500">{gateway.note}</p>
    </div>
  );
}

function EcommerceCard({ item }: { item: any }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-surface">{item.name}</h3>
          <p className="mt-1 text-xs font-bold uppercase text-slate-400">
            {item.connector}
          </p>
        </div>
        <Badge className="rounded-full bg-primary/15 text-surface">
          {item.status}
        </Badge>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {item.fields.map((field: string) => (
          <span
            key={field}
            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600"
          >
            {field}
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {item.insideStore.map((step: string, index: number) => (
          <div key={step} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm leading-6 text-slate-600">
              <span className="font-black text-surface">{index + 1}. </span>
              {step}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase text-slate-400">
          Webhook/callback
        </p>
        <code className="mt-1 block break-all text-xs text-surface">
          {item.webhook}
        </code>
      </div>
    </div>
  );
}

function DeveloperSdkModule({
  copiedBlock,
  copyBlock,
}: {
  copiedBlock: string | null;
  copyBlock: (label: string, text: string) => void;
}) {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <DocPanel
          icon={<KeyRound size={22} />}
          eyebrow="Payvex Developers"
          title="SDK para sistemas proprios"
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              O SDK Payvex e para desenvolvedores que querem integrar ERP,
              SaaS, app mobile, marketplace ou checkout customizado diretamente
              na API Payvex.
            </p>
            <p>
              Diferente dos plugins, aqui quem controla a experiencia do
              usuario e o sistema do cliente. A Payvex fica como API unica para
              criar transacoes, consultar status e receber eventos assinados.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Plugin", "Para WooCommerce, Shopify e Nuvemshop."],
              ["SDK", "Para sistemas customizados e backends proprios."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-black text-surface">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </DocPanel>

        <CodePanel
          label="install"
          title="Instalacao do pacote"
          code={sdkInstall}
          copied={copiedBlock === "Instalacao SDK"}
          onCopy={() => copyBlock("Instalacao SDK", sdkInstall)}
        />
      </section>

      <SdkPlayground copiedBlock={copiedBlock} copyBlock={copyBlock} />

      <section className="space-y-5">
        <SectionTitle
          icon={<PlugZap size={22} />}
          eyebrow="Casos de uso"
          title="Onde o SDK entra no negocio"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sdkUseCases.map(([title, description]) => (
            <div
              key={title}
              className="rounded-[1rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-base font-black text-surface">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <CodePanel
          label="typescript"
          title="Criar pagamento via SDK"
          code={sdkCreate}
          copied={copiedBlock === "Criar via SDK"}
          onCopy={() => copyBlock("Criar via SDK", sdkCreate)}
        />
        <CodePanel
          label="status"
          title="Consultar status por externalId"
          code={sdkStatus}
          copied={copiedBlock === "Status SDK"}
          onCopy={() => copyBlock("Status SDK", sdkStatus)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <DocPanel
          icon={<Route size={22} />}
          eyebrow="Contrato HTTP"
          title="Endpoints usados pelo SDK"
        >
          <div className="space-y-3">
            {sdkEndpoints.map(([method, path, description]) => (
              <div
                key={path}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full bg-surface text-white">
                    {method}
                  </Badge>
                  <code className="text-xs font-bold text-surface">{path}</code>
                </div>
                <p className="text-sm leading-6 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </DocPanel>

        <CodePanel
          label="curl"
          title="Mesmo fluxo sem SDK"
          code={sdkCurl}
          copied={copiedBlock === "Curl SDK"}
          onCopy={() => copyBlock("Curl SDK", sdkCurl)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <CodePanel
          label="webhook"
          title="Validar evento Payvex"
          code={sdkWebhook}
          copied={copiedBlock === "Webhook SDK"}
          onCopy={() => copyBlock("Webhook SDK", sdkWebhook)}
        />
        <DocPanel
          icon={<LockKeyhole size={22} />}
          eyebrow="Seguranca"
          title="Modelo de assinatura"
        >
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            <p>
              O sistema do cliente deve salvar o `whsec_...` gerado na Payvex e
              validar todo webhook recebido antes de atualizar pedido, liberar
              acesso ou entregar produto.
            </p>
            <p>
              A assinatura usa `timestamp.rawBody` com HMAC SHA-256. O SDK
              tambem confere tolerancia de tempo para reduzir risco de replay.
            </p>
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-primary/10 p-4 text-sm font-bold text-surface">
            X-Payvex-Signature + X-Payvex-Timestamp + whsec_
          </div>
        </DocPanel>
      </section>
    </div>
  );
}

function SdkPlayground({
  copiedBlock,
  copyBlock,
}: {
  copiedBlock: string | null;
  copyBlock: (label: string, text: string) => void;
}) {
  const [language, setLanguage] = useState<PlaygroundLanguage>("node");
  const [config, setConfig] = useState<PlaygroundConfig>(defaultPlaygroundConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const snippet = buildPlaygroundSnippet(language, config);

  const updateConfig = (field: keyof PlaygroundConfig, value: string) => {
    setConfig((current) => ({ ...current, [field]: value }));
  };

  const runTest = async () => {
    const apiKey = config.apiKey.trim();
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");

    if (!apiKey) {
      toast.error("Informe uma API Key px_live_ para testar.");
      return;
    }

    if (!baseUrl) {
      toast.error("Informe a base URL da API Payvex.");
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl}/transactions/plugin/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        body: JSON.stringify(buildPlaygroundPayload(config)),
      });
      const text = await response.text();
      const payload = safeJson(text);
      const formatted =
        typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);

      setTestResult(formatted || `HTTP ${response.status}`);

      if (response.ok) {
        toast.success("Teste enviado para a API Payvex.");
      } else {
        toast.error(`Teste retornou HTTP ${response.status}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao testar.";
      setTestResult(message);
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <section className="space-y-5">
      <SectionTitle
        icon={<Webhook size={22} />}
        eyebrow="Playground"
        title="Teste a API Payvex em varias linguagens"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {playgroundLanguages.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setLanguage(item.key)}
            className={`rounded-[1rem] border p-3 text-left transition-all ${
              language === item.key
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-slate-200 bg-white hover:border-primary/50"
            }`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src={item.iconUrl}
                alt={`${item.label} logo`}
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
            </span>
            <span className="mt-3 block text-xs font-black uppercase leading-4 text-surface">
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldLabel label="Base URL">
              <input
                value={config.baseUrl}
                onChange={(event) => updateConfig("baseUrl", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Linguagem">
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as PlaygroundLanguage)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              >
                {playgroundLanguages.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="API Key Payvex">
              <input
                type="password"
                value={config.apiKey}
                onChange={(event) => updateConfig("apiKey", event.target.value)}
                placeholder="px_live_..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Valor em centavos">
              <input
                value={config.amount}
                onChange={(event) => updateConfig("amount", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Gateway">
              <select
                value={config.gateway}
                onChange={(event) => updateConfig("gateway", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              >
                {[
                  "ASAAS",
                  "STRIPE",
                  "MERCADO_PAGO",
                  "PAGARME",
                  "PAG_BANK",
                  "CIELO",
                  "STONE",
                  "PAGSEGURO",
                  "PICPAY",
                  "NOWPAYMENTS",
                  "COINBASE_COMMERCE",
                  "BITPAY",
                ].map((gateway) => (
                  <option key={gateway} value={gateway}>
                    {gateway}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Metodo">
              <select
                value={config.paymentMethod}
                onChange={(event) => updateConfig("paymentMethod", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              >
                {["PIX", "BOLETO", "CREDIT_CARD", "CRYPTO"].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </FieldLabel>
            <FieldLabel label="Order ID">
              <input
                value={config.orderId}
                onChange={(event) => updateConfig("orderId", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Moeda">
              <input
                value={config.currency}
                onChange={(event) => updateConfig("currency", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="Nome do cliente">
              <input
                value={config.customerName}
                onChange={(event) => updateConfig("customerName", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
            <FieldLabel label="E-mail do cliente">
              <input
                value={config.customerEmail}
                onChange={(event) => updateConfig("customerEmail", event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-surface outline-none focus:border-primary"
              />
            </FieldLabel>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={runTest}
              disabled={isTesting}
              className="rounded-xl bg-primary text-surface hover:bg-surface hover:text-white"
            >
              {isTesting ? "Testando..." : "Testar na plataforma"}
            </Button>
            <Button
              variant="outline"
              onClick={() => copyBlock("Playground", snippet)}
              className="rounded-xl border-slate-200"
            >
              <Copy size={14} />
              {copiedBlock === "Playground" ? "Copiado" : "Copiar codigo"}
            </Button>
          </div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            Use uma chave de teste ou sandbox quando estiver apontando para
            `localhost`. A chave digitada aqui fica apenas no navegador durante
            o teste.
          </div>
          {testResult && (
            <div className="mt-5 overflow-hidden rounded-xl border border-[#44475a] bg-[#282a36]">
              <div className="border-b border-white/10 px-4 py-3 text-xs font-black uppercase text-[#50fa7b]">
                Resultado
              </div>
              <pre className="max-h-72 overflow-auto p-4 text-xs leading-5 text-[#f8f8f2]">
                <code>{renderDraculaCode(testResult)}</code>
              </pre>
            </div>
          )}
        </div>

        <CodePanel
          label={playgroundLanguages.find((item) => item.key === language)?.label || "Codigo"}
          title="Exemplo gerado pelo playground"
          code={snippet}
          copied={copiedBlock === "Playground"}
          onCopy={() => copyBlock("Playground", snippet)}
        />
      </div>
    </section>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function buildPlaygroundPayload(config: PlaygroundConfig) {
  return {
    amount: Number(config.amount || 0),
    currency: config.currency || "BRL",
    paymentMethod: config.paymentMethod,
    gateway: config.gateway,
    orderId: config.orderId,
    customerName: config.customerName,
    customerEmail: config.customerEmail,
    metadata: {
      source: "payvex-docs-playground",
      orderId: config.orderId,
    },
  };
}

function buildPlaygroundSnippet(
  language: PlaygroundLanguage,
  config: PlaygroundConfig,
): string {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const payload = buildSdkPayload(config);
  const apiKey = config.apiKey || "px_live_...";

  if (language === "node") {
    return `import { Payvex } from "@payvex/sdk";

const payvex = new Payvex({
  apiKey: process.env.PAYVEX_API_KEY ?? "${apiKey}",
  baseUrl: "${baseUrl}"
});

const transaction = await payvex.transactions.create(${jsObject(payload)});

console.log(transaction);`;
  }

  if (language === "typescript") {
    return `import { Payvex } from "@payvex/sdk";
import type { CreateTransactionInput } from "@payvex/sdk";

const payvex = new Payvex({
  apiKey: process.env.PAYVEX_API_KEY!,
  baseUrl: "${baseUrl}"
});

const input: CreateTransactionInput = ${jsObject(payload)};

const transaction = await payvex.transactions.create(input);`;
  }

  if (language === "python") {
    return `from payvex import Payvex

payvex = Payvex(
    api_key="${apiKey}",
    base_url="${baseUrl}"
)

transaction = payvex.transactions.create(${pythonDict(payload)})

print(transaction)`;
  }

  if (language === "csharp") {
    return `using Payvex;
using Payvex.Models;

var payvex = new PayvexClient(new PayvexOptions {
    ApiKey = Environment.GetEnvironmentVariable("PAYVEX_API_KEY") ?? "${apiKey}",
    BaseUrl = "${baseUrl}"
});

var transaction = await payvex.Transactions.CreateAsync(new CreateTransactionRequest {
    Amount = ${payload.amount},
    Currency = "${payload.currency}",
    PaymentMethod = "${payload.paymentMethod}",
    Gateway = "${payload.gateway}",
    OrderId = "${payload.orderId}",
    Customer = new PayvexCustomer {
        Name = "${payload.customer.name}",
        Email = "${payload.customer.email}"
    },
    Metadata = new Dictionary<string, object> {
        ["source"] = "payvex-docs-playground",
        ["orderId"] = "${payload.orderId}"
    }
});

Console.WriteLine(transaction.Status);`;
  }

  if (language === "java") {
    return `import com.payvex.PayvexClient;
import com.payvex.models.CreateTransactionRequest;

var payvex = PayvexClient.builder()
    .apiKey(System.getenv().getOrDefault("PAYVEX_API_KEY", "${apiKey}"))
    .baseUrl("${baseUrl}")
    .build();

var transaction = payvex.transactions().create(
    CreateTransactionRequest.builder()
        .amount(${payload.amount})
        .currency("${payload.currency}")
        .paymentMethod("${payload.paymentMethod}")
        .gateway("${payload.gateway}")
        .orderId("${payload.orderId}")
        .customerName("${payload.customer.name}")
        .customerEmail("${payload.customer.email}")
        .metadata("source", "payvex-docs-playground")
        .build()
);

System.out.println(transaction.getStatus());`;
  }

  if (language === "ruby") {
    return `require "payvex"

payvex = Payvex::Client.new(
  api_key: ENV.fetch("PAYVEX_API_KEY", "${apiKey}"),
  base_url: "${baseUrl}"
)

transaction = payvex.transactions.create(${rubyHash(payload)})

puts transaction.status`;
  }

  if (language === "go") {
    return `package main

import (
  "context"
  "fmt"
  "os"

  payvex "github.com/payvex/payvex-go"
)

func main() {
  client := payvex.NewClient(payvex.Config{
    APIKey:  firstNonEmpty(os.Getenv("PAYVEX_API_KEY"), "${apiKey}"),
    BaseURL: "${baseUrl}",
  })

  transaction, err := client.Transactions.Create(context.Background(), payvex.CreateTransactionInput{
    Amount:        ${payload.amount},
    Currency:      "${payload.currency}",
    PaymentMethod: "${payload.paymentMethod}",
    Gateway:       "${payload.gateway}",
    OrderID:       "${payload.orderId}",
    Customer: payvex.Customer{
      Name:  "${payload.customer.name}",
      Email: "${payload.customer.email}",
    },
    Metadata: map[string]any{
      "source": "payvex-docs-playground",
      "orderId": "${payload.orderId}",
    },
  })

  if err != nil {
    panic(err)
  }

  fmt.Println(transaction.Status)
}

func firstNonEmpty(values ...string) string {
  for _, value := range values {
    if value != "" {
      return value
    }
  }
  return ""
}`;
  }

  if (language === "php") {
    return `<?php

require_once __DIR__ . "/vendor/autoload.php";

use Payvex\\PayvexClient;

$payvex = new PayvexClient(
    apiKey: getenv("PAYVEX_API_KEY") ?: "${apiKey}",
    baseUrl: "${baseUrl}",
);

$transaction = $payvex->transactions->create(${phpArray(payload)});

echo $transaction->status;`;
  }

  return "";
}

function buildSdkPayload(config: PlaygroundConfig) {
  return {
    amount: Number(config.amount || 0),
    currency: config.currency || "BRL",
    paymentMethod: config.paymentMethod,
    gateway: config.gateway,
    orderId: config.orderId,
    customer: {
      name: config.customerName,
      email: config.customerEmail,
    },
    metadata: {
      source: "payvex-docs-playground",
      orderId: config.orderId,
    },
  };
}

function jsObject(value: unknown, indent = 0): string {
  const spacing = " ".repeat(indent);
  const nextSpacing = " ".repeat(indent + 2);

  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[\n${value.map((item) => `${nextSpacing}${jsObject(item, indent + 2)}`).join(",\n")}\n${spacing}]`;
  }

  return `{\n${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${nextSpacing}${key}: ${jsObject(item, indent + 2)}`)
    .join(",\n")}\n${spacing}}`;
}

function pythonDict(value: unknown, indent = 0): string {
  const spacing = " ".repeat(indent);
  const nextSpacing = " ".repeat(indent + 4);

  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  if (!value) {
    return "None";
  }

  if (Array.isArray(value)) {
    return `[\n${value.map((item) => `${nextSpacing}${pythonDict(item, indent + 4)}`).join(",\n")}\n${spacing}]`;
  }

  return `{\n${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${nextSpacing}"${key}": ${pythonDict(item, indent + 4)}`)
    .join(",\n")}\n${spacing}}`;
}

function phpArray(value: unknown, indent = 0): string {
  const spacing = " ".repeat(indent);
  const nextSpacing = " ".repeat(indent + 4);

  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[\n${value.map((item) => `${nextSpacing}${phpArray(item, indent + 4)}`).join(",\n")}\n${spacing}]`;
  }

  return `[\n${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${nextSpacing}"${key}" => ${phpArray(item, indent + 4)}`)
    .join(",\n")}\n${spacing}]`;
}

function rubyHash(value: unknown, indent = 0): string {
  const spacing = " ".repeat(indent);
  const nextSpacing = " ".repeat(indent + 2);

  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (!value) {
    return "nil";
  }

  if (Array.isArray(value)) {
    return `[\n${value.map((item) => `${nextSpacing}${rubyHash(item, indent + 2)}`).join(",\n")}\n${spacing}]`;
  }

  return `{\n${Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${nextSpacing}"${key}" => ${rubyHash(item, indent + 2)}`)
    .join(",\n")}\n${spacing}}`;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function SystemSnapshot() {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-950 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs font-bold text-slate-400">
          Payvex / E-commerce
        </span>
      </div>
      <div className="grid gap-4 rounded-[1rem] bg-white p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Chaves de acesso ativas
          </p>
          <div className="mt-4 space-y-3">
            {["woocommerce_teste", "nuvem_shop_teste"].map((name, index) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div>
                  <p className="text-xs font-black text-surface">{name}</p>
                  <p className="text-[10px] text-slate-400">
                    {index === 0 ? "Matriz" : "Filial Feira"}
                  </p>
                </div>
                <code className="rounded-lg bg-white px-2 py-1 text-[10px] text-slate-500">
                  px_live_0f80e3...
                </code>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Gateways de pagamento
          </p>
          <div className="mt-4 space-y-3">
            {["Stripe", "Asaas", "NOWPayments"].map((name, index) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <span className="text-xs font-black text-surface">{name}</span>
                <span
                  className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${
                    index === 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {index === 0 ? "Conectado" : "Pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WebhookSnapshot() {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-6 shadow-sm">
      <SectionTitle
        icon={<LockKeyhole size={22} />}
        eyebrow="Assinatura"
        title="Como o e-commerce valida o Payvex"
      />
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ["1", "Raw body", "O corpo JSON original entra no HMAC."],
          ["2", "Timestamp", "O header evita replay antigo."],
          ["3", "whsec_", "O secret fica salvo no plugin."],
        ].map(([step, title, desc]) => (
          <div key={step} className="rounded-xl bg-slate-50 p-4">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-black text-white">
              {step}
            </div>
            <p className="text-sm font-black text-surface">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-dashed border-primary/30 bg-primary/10 p-4 text-sm font-bold text-surface">
        HMAC_SHA256(timestamp + "." + rawBody, webhookSecret)
      </div>
    </div>
  );
}
