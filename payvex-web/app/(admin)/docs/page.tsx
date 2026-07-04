"use client";

import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Cable,
  Code2,
  Copy,
  KeyRound,
  Layers3,
  Puzzle,
  ReceiptText,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "react-hot-toast";

const installSteps = [
  "Gerar uma API Key para a filial no painel da Payvex.",
  "Salvar a API Key no plugin WooCommerce.",
  "Consultar `GET /identity/plugin/me` para validar a instalação.",
  "Registrar a URL do webhook com `PATCH /identity/plugin/webhook`.",
  "Criar cobranças com `POST /transactions/plugin/create`.",
  "Receber eventos assinados e atualizar o pedido automaticamente.",
];

const pluginEvents = [
  {
    event: "payment.approved",
    meaning: "Pedido pago e elegível para `payment_complete()` no WooCommerce.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    event: "payment.failed",
    meaning: "Falha de pagamento. O pedido pode ser marcado como `failed`.",
    color: "bg-rose-100 text-rose-700",
  },
  {
    event: "payment.expired",
    meaning: "Cobrança expirada. O pedido pode ser cancelado.",
    color: "bg-slate-200 text-slate-700",
  },
  {
    event: "payment.canceled",
    meaning: "Pagamento cancelado na Payvex. O pedido pode ser cancelado.",
    color: "bg-slate-200 text-slate-700",
  },
];

const endpointCards = [
  {
    method: "GET",
    path: "/identity/plugin/me",
    title: "Consultar instalação",
    description:
      "Retorna dados da API Key ativa, filial vinculada, webhook atual e status da integração.",
  },
  {
    method: "PATCH",
    path: "/identity/plugin/webhook",
    title: "Registrar webhook",
    description:
      "Vincula a URL do plugin WordPress para receber eventos de pagamento assinados.",
  },
  {
    method: "POST",
    path: "/transactions/plugin/create",
    title: "Criar cobrança",
    description:
      "Cria a transação a partir do checkout do plugin usando a API Key da loja.",
  },
];

const sampleHeaders = `X-API-Key: px_live_xxxxxxxxxxxxx
X-Payvex-Signature: sha256=<hash>
X-Payvex-Timestamp: 1710000000000
X-Payvex-Event: payment.approved
X-Payvex-Delivery: 550e8400-e29b-41d4-a716-446655440000`;

const samplePayload = `{
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
}`;

const sampleWebhook = `{
  "event": "payment.approved",
  "data": {
    "id": "tx_123",
    "externalId": "pi_123",
    "amount": 129.9,
    "netAmount": 124.5,
    "status": "PAID",
    "customerName": "Joao Silva",
    "customerEmail": "joao@email.com",
    "paidAt": "2026-03-21T13:00:00.000Z",
    "metadata": {
      "orderId": 1234,
      "orderKey": "wc_order_abcd1234",
      "siteUrl": "https://loja.com"
    }
  }
}`;

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
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(130,214,22,0.18),_transparent_28%),linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#334155_100%)] p-8 text-white shadow-2xl md:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-[#82d616]">
                <BookOpen size={14} />
                Docs Hub
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
                  Documentação de
                  <span className="text-[#82d616]"> Integrações e Plugins</span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                  Guia operacional da Payvex para plugins de e-commerce,
                  autenticação por API Key, criação de cobrança, webhooks
                  assinados e sincronização de pedidos WooCommerce.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="rounded-full bg-white/10 px-4 py-2 text-white">
                  WooCommerce pronto
                </Badge>
                <Badge className="rounded-full bg-white/10 px-4 py-2 text-white">
                  API Key + Webhook Secret
                </Badge>
                <Badge className="rounded-full bg-white/10 px-4 py-2 text-white">
                  Eventos multi-status
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#82d616] text-[#132238]">
                  <Puzzle size={22} />
                </div>
                <h2 className="text-lg font-black">Fluxo do Plugin</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Instalação, teste de conexão, registro do webhook e checkout
                  PIX conectados ao backend da Payvex.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#82d616] text-[#132238]">
                  <ShieldCheck size={22} />
                </div>
                <h2 className="text-lg font-black">Segurança</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Assinatura HMAC SHA-256 com `webhookSecret`, timestamp e
                  delivery id para rastreabilidade.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#82d616]/15 text-[#3a416f]">
                <Layers3 size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#82d616]">
                  Instalação
                </p>
                <h2 className="text-2xl font-black text-[#3a416f]">
                  Passo a passo do plugin
                </h2>
              </div>
            </div>
            <div className="space-y-4">
              {installSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a416f] text-xs font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium leading-6 text-slate-600">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#82d616]/15 text-[#3a416f]">
                <Cable size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#82d616]">
                  Endpoints
                </p>
                <h2 className="text-2xl font-black text-[#3a416f]">
                  Contrato do plugin
                </h2>
              </div>
            </div>
            <div className="space-y-4">
              {endpointCards.map((item) => (
                <div
                  key={item.path}
                  className="rounded-3xl border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <Badge className="rounded-full bg-[#3a416f] px-3 py-1 text-white">
                      {item.method}
                    </Badge>
                    <code className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      {item.path}
                    </code>
                  </div>
                  <h3 className="text-base font-black text-[#3a416f]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr_0.85fr]">
          <DocCodeCard
            icon={<KeyRound size={18} />}
            title="Headers essenciais"
            subtitle="Autenticação e assinatura"
            code={sampleHeaders}
            copied={copiedBlock === "Headers"}
            onCopy={() => copyBlock("Headers", sampleHeaders)}
          />
          <DocCodeCard
            icon={<ReceiptText size={18} />}
            title="Payload de criação"
            subtitle="Checkout WooCommerce -> Payvex"
            code={samplePayload}
            copied={copiedBlock === "Payload"}
            onCopy={() => copyBlock("Payload", samplePayload)}
          />
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#82d616]/15 text-[#3a416f]">
                <Webhook size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#82d616]">
                  Eventos
                </p>
                <h2 className="text-2xl font-black text-[#3a416f]">
                  Estados suportados
                </h2>
              </div>
            </div>
            <div className="space-y-3">
              {pluginEvents.map((item) => (
                <div
                  key={item.event}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="mb-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase ${item.color}`}
                    >
                      {item.event}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {item.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-[#3a416f] p-8 text-white shadow-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#82d616]">
                <Code2 size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#82d616]">
                  Webhook payload
                </p>
                <h2 className="text-2xl font-black">
                  Evento entregue ao plugin
                </h2>
              </div>
            </div>
            <p className="mb-5 max-w-xl text-sm leading-6 text-slate-300">
              O plugin recebe `metadata.orderId`, `metadata.orderKey` e
              `metadata.siteUrl` no webhook para localizar o pedido com mais
              segurança do que apenas pelos IDs da transação.
            </p>
            <Button
              onClick={() => copyBlock("Webhook", sampleWebhook)}
              className="rounded-xl bg-[#82d616] text-[#24314d] hover:bg-white"
            >
              <Copy size={14} />
              {copiedBlock === "Webhook" ? "Copiado" : "Copiar webhook"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-[#0f172a] shadow-xl">
            <pre className="h-full overflow-x-auto p-8 text-[13px] leading-6 text-emerald-200">
              <code>{sampleWebhook}</code>
            </pre>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}

function DocCodeCard({
  icon,
  title,
  subtitle,
  code,
  copied,
  onCopy,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#82d616]/15 text-[#3a416f]">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-black text-[#3a416f]">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onCopy}
          className="rounded-xl border-slate-200"
        >
          <Copy size={14} />
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre className="overflow-x-auto bg-white p-6 text-[13px] leading-6 text-slate-700">
        <code>{code}</code>
      </pre>
    </div>
  );
}
