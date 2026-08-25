/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  ArrowUpCircle,
  Check,
  CreditCard,
  Globe,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        // 1. Verificação imediata de Role
        const savedUser = JSON.parse(
          localStorage.getItem("@payvex:user") || "{}",
        );
        const role = savedUser.role;
        setUserRole(role);

        // 2. Se não for ADMIN, nem dispara os gatilhos da API
        if (role !== "ADMIN") {
          setLoading(false);
          return;
        }

        // 3. Se for ADMIN, carrega os dados financeiros
        const [subRes, plansRes] = await Promise.all([
          api.get("/my-subscription"),
          api.get("/plans"),
        ]);
        setData(subRes.data);
        setPlans(plansRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndFetch();
  }, []);

  const handleUpgrade = async (planKey: string) => {
    try {
      setUpgrading(planKey);
      const response = await api.post("/subscription/checkout", { planKey });
      const paymentUrl = response.data.checkoutUrl;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.error(
          "O Asaas criou a assinatura, mas não retornou um link de fatura.",
        );
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erro ao processar pagamento.",
      );
    } finally {
      setUpgrading(null);
    }
  };

  // --- TELA DE CARREGAMENTO ---
  if (loading)
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  // --- TELA DE RESTRIÇÃO PARA USUÁRIO COMUM ---
  if (userRole !== "ADMIN") {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6 py-24 text-center">
          <div className="h-24 w-24 bg-surface/10 rounded-full flex items-center justify-center text-surface border border-surface/20 shadow-2xl shadow-surface/10">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-surface">
              Gestão de Assinatura
            </h1>
            <p className="text-slate-500 max-w-md mx-auto">
              A visualização de faturas, limites de consumo e upgrade de planos
              é restrita ao
              <b> Proprietário da Conta</b>. Colaboradores não têm permissão de
              alteração financeira.
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="rounded-xl gap-2 font-bold border-slate-200"
            >
              <ArrowLeft size={18} /> Ir para o Dashboard
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // --- LAYOUT ORIGINAL (APENAS PARA ADMIN) ---
  const usagePercent = data
    ? Math.min((data.currentUsage / data.transactionsLimit) * 100, 100)
    : 0;

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-surface">
          Assinatura e Planos
        </h1>
        <p className="text-slate-500">
          Gerencie sua conta, limites e escala sua operação.
        </p>
      </div>

      {/* CARD STATUS ATUAL */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1 block">
              Plano Ativo
            </span>
            <h2 className="text-3xl font-black text-surface">
              {data?.planName?.toUpperCase()}
            </h2>
          </div>
          <div className="bg-[#ECFDF5] text-[#059669] px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold border border-[#D1FAE5]">
            <ShieldCheck size={16} /> Status: {data?.status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-slate-500">Uso de Transações</span>
              <span className="text-slate-800">
                {data?.currentUsage} / {data?.transactionsLimit}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${usagePercent > 90 ? "bg-red-500" : "bg-surface"}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase leading-tight">
                Limites de Gateways
              </p>
              <p className="font-bold text-surface">
                {data?.gatewaysLimit} Conexões
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase leading-tight">
                Apps E-commerce
              </p>
              <p className="font-bold text-surface">
                Até {data?.multiAppLimit}{" "}
                {data?.multiAppLimit > 1 ? "Lojas" : "Loja"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <div
              className={`h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm ${data?.hasAiAnalyst ? "text-yellow-500" : "text-slate-400"}`}
            >
              {data?.hasAiAnalyst ? (
                <Zap size={20} fill="currentColor" />
              ) : (
                <Lock size={20} />
              )}
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase leading-tight">
                Analista de IA
              </p>
              <p className="font-bold text-surface">
                {data?.hasAiAnalyst ? "Liberado" : "Bloqueado"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LISTAGEM DE PLANOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan: any) => {
          const isCurrentPlan =
            data?.planName?.toUpperCase() === plan.name.toUpperCase();
          const isUpgradingThis = upgrading === plan.key;

          return (
            <div
              key={plan.key}
              className={`bg-white rounded-[32px] p-8 border ${plan.key === "EXPERT_AI" ? "border-primary ring-4 ring-[#82d616]/5" : "border-slate-100"} flex flex-col`}
            >
              <h3 className="text-lg font-bold text-surface">{plan.name}</h3>
              <div className="my-6 flex items-baseline gap-1">
                <span className="text-4xl font-black text-surface">
                  R$ {plan.price.toLocaleString("pt-BR")}
                </span>
                <span className="text-slate-400 text-sm">/mês</span>
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <Check size={18} className="text-[#059669]" />{" "}
                  {plan.transactionsLimit.toLocaleString()} transações
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <Check size={18} className="text-[#059669]" />{" "}
                  {plan.gatewaysLimit} Gateways
                </li>
                <li className="flex items-center gap-3 text-sm text-slate-700">
                  <Check size={18} className="text-[#059669]" />{" "}
                  {plan.multiAppLimit} integração e-commerce
                </li>
                <li
                  className={`flex items-center gap-3 text-sm ${plan.hasAiAnalyst ? "text-slate-700 font-bold" : "text-slate-300"}`}
                >
                  {plan.hasAiAnalyst ? (
                    <Zap
                      size={18}
                      className="text-yellow-500 fill-yellow-500"
                    />
                  ) : (
                    <Lock size={18} />
                  )}
                  Analista de IA Data-Bot
                </li>
              </ul>

              <button
                disabled={isCurrentPlan || !!upgrading}
                onClick={() => handleUpgrade(plan.key)}
                className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isCurrentPlan
                    ? "bg-slate-100 text-slate-400 cursor-default"
                    : "bg-primary hover:bg-primary-dark text-surface shadow-lg shadow-primary/20"
                } ${upgrading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isCurrentPlan ? (
                  "Plano Atual"
                ) : isUpgradingThis ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ArrowUpCircle size={20} /> Assinar Plano
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
