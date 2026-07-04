 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

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

  const loadInitialData = async () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("@payvex:user") || "{}",
      );
      setUser(savedUser);

      const resCompany = await api.get(`/companies/${savedUser.companyId}`);
      setFiliais(resCompany.data.filiais || []);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const isAdmin = user?.role === "ADMIN";

  return (
    <PageTransition>
      <div className="space-y-8 pb-10">
        {/* TOP BAR / FILTROS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-[#3a416f] tracking-tight">
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
              <Building2 size={16} className="text-[#82d616] ml-2" />
              <select
                disabled={!isAdmin}
                value={selectedFilialId}
                onChange={(e) =>
                  handleFilterChange(e.target.value, selectedGateway)
                }
                className="bg-transparent text-xs font-bold text-[#3a416f] outline-none w-full cursor-pointer"
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
                className="bg-transparent text-xs font-bold text-[#3a416f] outline-none w-full cursor-pointer"
              >
                <option value="">Todos Gateways</option>
                <option value="STRIPE">Stripe (Global)</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
              </select>
            </div>
          </div>
        </div>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-none shadow-xl bg-[#3a416f] text-white relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={100} />
            </div>
            <CardHeader className="pb-1">
              <CardTitle className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                Disponível p/ Saque (Net)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-[#82d616] tracking-tighter">
                {loading ? (
                  <Loader2 className="animate-spin h-6 w-6" />
                ) : (
                  formatCurrency(stats?.totalNet || 0)
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 font-bold">
                <ShieldCheck size={12} className="text-[#82d616]" /> VALOR REAL
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
              <div className="text-2xl font-black text-[#3a416f]">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6 min-h-[450px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-[#3a416f]">
                  Performance de Vendas
                </h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                  Últimos 30 dias
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#82d616]" />{" "}
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
                  <Loader2 className="animate-spin text-[#82d616]" />
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

          {/* INSIGHTS DINÂMICOS */}
          <div className="bg-[#1a1f2e] rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col shadow-2xl">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-[#82d616] rounded-full blur-[60px] opacity-20"></div>

            <div className="flex items-center gap-2 mb-8 text-[#82d616]">
              <div className="p-2 bg-[#82d616]/10 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-black uppercase text-[10px] tracking-[0.2em]">
                Payvex Intelligence
              </h3>
            </div>

            <div className="space-y-6 flex-1 relative z-10">
              <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/[0.08] transition-all">
                <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">
                  Otimização
                </p>
                <p className="text-sm font-medium leading-relaxed">
                  Você recuperou{" "}
                  <span className="text-[#82d616] font-bold">
                    {formatCurrency(
                      stats?.totalFees ? stats.totalFees * 0.15 : 0,
                    )}
                  </span>{" "}
                  em taxas ocultas este mês através do bypass inteligente.
                </p>
              </div>

              <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] text-slate-400 mb-2 font-bold uppercase tracking-widest">
                  Melhor Canal
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                    <Blocks size={16} />
                  </div>
                  <p className="text-sm font-bold text-white">
                    {selectedGateway || "Multi-Gateway Ativo"}
                  </p>
                </div>
              </div>
            </div>

            <button className="w-full mt-8 py-4 bg-[#82d616] text-[#3a416f] font-black text-xs uppercase rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#82d616]/20">
              Exportar Analítico
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
