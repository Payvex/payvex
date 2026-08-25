"use client";

import { cn } from "@/lib/utils";
import {
  Bot,
  CircleDollarSign,
  LockKeyhole,
  Loader2,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

export interface AnalystMessage {
  role: "user" | "assistant";
  content: string;
}

interface FinancialAnalystChatProps {
  hasAiAnalyst: boolean;
  subscriptionPlan: string;
  stats: {
    totalSales: number;
    totalFees: number;
    count: number;
  } | null;
  question: string;
  messages: AnalystMessage[];
  loading: boolean;
  quickPrompts: string[];
  formatCurrency: (value: number) => string;
  onQuestionChange: (value: string) => void;
  onAsk: (question?: string) => void;
}

export function FinancialAnalystChat({
  hasAiAnalyst,
  subscriptionPlan,
  stats,
  question,
  messages,
  loading,
  quickPrompts,
  formatCurrency,
  onQuestionChange,
  onAsk,
}: FinancialAnalystChatProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const feeRate = stats?.totalSales
    ? `${((stats.totalFees / stats.totalSales) * 100).toFixed(2)}%`
    : "0.00%";
  const averageTicket = stats?.count
    ? formatCurrency((stats.totalSales || 0) / stats.count)
    : formatCurrency(0);

  return (
    <section className="flex h-[720px] max-h-[calc(100vh-140px)] min-h-[600px] w-full flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_22px_70px_rgba(37,99,235,0.12)]">
      <header className="flex items-start justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <Bot size={21} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-black text-surface">
                Agente Analítico Financeiro
              </h3>
              <span className="hidden rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 sm:inline-flex">
                AI
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-slate-500">
              Estuda transações, taxas, gateways e pendências do dashboard.
            </p>
          </div>
        </div>

        <div
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase",
            hasAiAnalyst
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-slate-200 bg-slate-50 text-slate-500",
          )}
        >
          {hasAiAnalyst ? subscriptionPlan || "Enterprise" : "Bloqueado"}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-2 border-b border-blue-100 bg-blue-50/40 px-5 py-3 sm:grid-cols-2">
        <MetricPill
          icon={<TrendingUp size={14} />}
          label="Taxa efetiva"
          value={feeRate}
        />
        <MetricPill
          icon={<CircleDollarSign size={14} />}
          label="Ticket médio"
          value={averageTicket}
        />
      </div>

      {!hasAiAnalyst && (
        <div className="mx-5 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <div className="mb-1 flex items-center gap-2 font-black">
            <LockKeyhole size={15} />
            Recurso Enterprise
          </div>
          A IA analítica lê dados financeiros reais da Payvex. Faça upgrade para
          liberar perguntas, diagnósticos e recomendações no dashboard.
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.map((message, index) => (
            <MessageRow key={`${message.role}-${index}`} message={message} />
          ))}

          {loading && (
            <div className="flex gap-3">
              <Avatar role="assistant" />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  Analisando seus indicadores financeiros...
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <footer className="border-t border-blue-100 bg-white px-5 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={!hasAiAnalyst || loading}
                onClick={() => onAsk(prompt)}
                className="min-h-12 rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-left text-[11px] font-bold leading-4 text-blue-900 transition-colors hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={12} className="mr-1 inline text-blue-600" />
                {prompt}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner focus-within:border-blue-400 focus-within:bg-white">
            <textarea
              value={question}
              disabled={!hasAiAnalyst || loading}
              rows={1}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onAsk();
                }
              }}
              placeholder="Pergunte ao agente sobre saúde financeira, taxas, liquidez ou gateways..."
              className="max-h-28 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm font-medium text-surface outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              disabled={!hasAiAnalyst || loading}
              onClick={() => onAsk()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Enviar pergunta para a IA analítica"
            >
              <Send size={18} />
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] font-medium text-slate-400">
            O agente pode errar. Use os insights como apoio para análise
            financeira e conciliação.
          </p>
        </div>
      </footer>
    </section>
  );
}

function MessageRow({ message }: { message: AnalystMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3",
        isAssistant ? "items-start" : "items-start justify-end",
      )}
    >
      {isAssistant && <Avatar role="assistant" />}

      <article
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6",
          isAssistant
            ? "border border-blue-100 bg-white text-slate-700 shadow-sm"
            : "bg-surface text-white shadow-sm",
        )}
      >
        <div
          className={cn(
            "mb-1 text-[10px] font-black uppercase tracking-widest",
            isAssistant ? "text-blue-600" : "text-white/65",
          )}
        >
          {isAssistant ? "Agente Payvex" : "Você"}
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </article>

      {!isAssistant && <Avatar role="user" />}
    </div>
  );
}

function Avatar({ role }: { role: AnalystMessage["role"] }) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
        isAssistant
          ? "border-blue-200 bg-blue-50 text-blue-600"
          : "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {isAssistant ? <Bot size={16} /> : <User size={15} />}
    </div>
  );
}

function MetricPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-black text-surface">{value}</p>
      </div>
    </div>
  );
}
