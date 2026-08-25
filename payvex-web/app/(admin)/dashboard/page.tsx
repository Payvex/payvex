 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  FinancialAnalystChat,
  type AnalystMessage,
} from "@/components/ai/financial-analyst-chat";
import { PageTransition } from "@/components/page-transition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Blocks,
  Building2,
  Clock,
  DollarSign,
  Loader2,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

interface DashboardStats {
  totalSales: number;
  totalFees: number;
  totalNet: number;
  pendingAmount: number;
  count: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [selectedFilialId, setSelectedFilialId] = useState<string>("");
  const [selectedGateway, setSelectedGateway] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [hasAiAnalyst, setHasAiAnalyst] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState("");
  const [analystQuestion, setAnalystQuestion] = useState("");
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystMessages, setAnalystMessages] = useState<AnalystMessage[]>([
    {
      role: "assistant",
      content:
        "Olá. Eu sou a IA Analítica da Payvex. Posso avaliar liquidez, taxas, pendências, aprovação por gateway e próximos passos com base nos dados deste dashboard.",
    },
  ]);

  const loadInitialData = async () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("@payvex:user") || "{}",
      );
      setUser(savedUser);

      const resCompany = await api.get(`/companies/${savedUser.companyId}`);
      setFiliais(resCompany.data.filiais || []);
      const subscription = resCompany.data.subscription;
      const normalizedPlan = String(subscription?.planName || "")
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
      setSubscriptionPlan(subscription?.planName || "");
      setHasAiAnalyst(
        !!subscription?.hasAiAnalyst ||
          ["expert_ai", "enterprise", "expert"].includes(normalizedPlan),
      );

      const initialFilialId =
        savedUser.role === "USER" ? savedUser.filialId : "";
      setSelectedFilialId(initialFilialId);

      await fetchAllDashboardData(initialFilialId, "");
    } catch (error) {
      toast.error("Erro ao sincronizar dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDashboardData = async (filialId: string, gateway: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filialId) query.append("filialId", filialId);
      if (gateway) query.append("gateway", gateway);

      const [resStats, resChart] = await Promise.all([
        api.get(`/transactions/stats?${query.toString()}`),
        api.get(`/transactions/chart?${query.toString()}`),
      ]);

      setStats(resStats.data);
      setChartData(resChart.data);
    } catch (error) {
      console.error("Erro ao buscar dados dinâmicos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFilterChange = (filial: string, gateway: string) => {
    setSelectedFilialId(filial);
    setSelectedGateway(gateway);
    fetchAllDashboardData(filial, gateway);
  };

  const askFinancialAnalyst = async (question?: string) => {
    const finalQuestion = (question || analystQuestion).trim();

    if (!finalQuestion) {
      toast.error("Digite uma pergunta para a IA analítica.");
      return;
    }

    if (!hasAiAnalyst) {
      toast.error("IA Analítica disponível apenas no plano Enterprise.");
      return;
    }

    const nextMessages: AnalystMessage[] = [
      ...analystMessages,
      { role: "user", content: finalQuestion },
    ];

    setAnalystMessages(nextMessages);
    setAnalystQuestion("");
    setAnalystLoading(true);

    try {
      const response = await api.post("/ai/financial-analyst/chat", {
        question: finalQuestion,
        filialId: selectedFilialId || undefined,
        gateway: selectedGateway || undefined,
        messages: analystMessages.slice(-6),
      });

      setAnalystMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: response.data.answer,
        },
      ]);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Não consegui consultar a IA analítica agora.";
      toast.error(message);
      setAnalystMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setAnalystLoading(false);
    }
  };

  const GATEWAY_OPTIONS = [
    { value: "STRIPE", label: "Stripe (Global)" },
    { value: "MERCADO_PAGO", label: "Mercado Pago (LATAM)" },
    { value: "PAGAR_ME", label: "Pagar.me (Recorrência)" },
    { value: "PAGBANK", label: "PagBank (Banco Digital)" },
    { value: "ASAAS", label: "Asaas (Cobranças)" },
    { value: "STONE", label: "Stone (Adquirente)" },
    { value: "NOWPAYMENTS", label: "NOWPayments (Cripto)" },
    { value: "COINBASE_COMMERCE", label: "Coinbase Commerce (Cripto)" },
    { value: "BITPAY", label: "BitPay (Cripto)" },
    { value: "PICPAY", label: "PicPay (Carteira)" },
    { value: "PAGSEGURO", label: "PagSeguro (Latam)" },
    { value: "CIELO", label: "Cielo (Adquirente)" },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const isAdmin = user?.role === "ADMIN";
  const quickAnalystPrompts = [
    "Como está minha saúde financeira hoje?",
    "Onde estou perdendo mais em taxas?",
    "Quais pendências merecem atenção?",
  ];

  return (
    <PageTransition>
      <div className="space-y-8 pb-10">
        {/* TOP BAR / FILTROS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-surface tracking-tight">
              Performance
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Análise inteligente de gateway e liquidez.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            {/* SELETOR FILIAL */}
            <div
              className={cn(
                "bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 min-w-[220px]",
                !isAdmin && "opacity-60 bg-slate-50",
              )}
            >
              <Building2 size={16} className="text-primary ml-2" />
              <select
                disabled={!isAdmin}
                value={selectedFilialId}
                onChange={(e) =>
                  handleFilterChange(e.target.value, selectedGateway)
                }
                className="bg-transparent text-xs font-bold text-surface outline-none w-full cursor-pointer"
              >
                {isAdmin && <option value="">Rede: Global</option>}
                {filiais.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SELETOR GATEWAY */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 min-w-[180px]">
              <Blocks size={16} className="text-blue-500 ml-2" />
              <select
                value={selectedGateway}
                onChange={(e) =>
                  handleFilterChange(selectedFilialId, e.target.value)
                }
                className="bg-transparent text-xs font-bold text-surface outline-none w-full cursor-pointer"
              >
                <option value="">Todos Gateways</option>
                {GATEWAY_OPTIONS.map((gw) => (
                  <option key={gw.value} value={gw.value}>
                    {gw.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-xl bg-surface text-white relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={100} />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                Disponível p/ Saque (Net)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-primary tracking-tighter">
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  formatCurrency(stats?.totalNet || 0)
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-bold">
                <ShieldCheck size={12} className="text-primary" /> VALOR REAL
                SEM TAXAS
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white border-b-2 border-slate-100">
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                Volume Bruto
              </CardTitle>
              <DollarSign size={14} className="text-slate-300" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-surface">
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  formatCurrency(stats?.totalSales || 0)
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                {stats?.count || 0} vendas aprovadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white border-b-2 border-amber-500/20">
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                Taxas Pagas
              </CardTitle>
              <BarChart3 size={14} className="text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-amber-600">
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  formatCurrency(stats?.totalFees || 0)
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Consumo operacional de gateways
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white border-b-2 border-blue-500/20">
            <CardHeader className="pb-1 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500 font-black">
                Pendente
              </CardTitle>
              <Clock size={14} className="text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-blue-600">
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  formatCurrency(stats?.pendingAmount || 0)
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                Aguardando confirmação
              </p>
            </CardContent>
          </Card>
        </div>

        {/* GRÁFICO E INSIGHTS */}
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-5">
          <Card className="border-none shadow-sm bg-white p-6 min-h-[450px] xl:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-surface">
                  Performance de Vendas
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  Últimos 30 dias
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />{" "}
                  Volume Bruto
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Valor
                  Líquido
                </div>
              </div>
            </div>

            <div className="h-[320px] w-full">
              {loading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#82d616"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#82d616"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 10,
                        fontWeight: "bold",
                        fill: "#94a3b8",
                      }}
                      tickFormatter={(val) =>
                        val.split("-")[2] + "/" + val.split("-")[1]
                      }
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      formatter={(val: ValueType | undefined) => [
                        formatCurrency(typeof val === "number" ? val : 0),
                        "",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#82d616"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorNet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 italic text-sm">
                  <BarChart3 size={40} className="mb-2 opacity-20" />
                  Sem dados para o período selecionado.
                </div>
              )}
            </div>
          </Card>

          <div className="xl:col-span-3">
            <FinancialAnalystChat
              hasAiAnalyst={hasAiAnalyst}
              subscriptionPlan={subscriptionPlan}
              stats={stats}
              question={analystQuestion}
              messages={analystMessages}
              loading={analystLoading}
              quickPrompts={quickAnalystPrompts}
              formatCurrency={formatCurrency}
              onQuestionChange={setAnalystQuestion}
              onAsk={askFinancialAnalyst}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
