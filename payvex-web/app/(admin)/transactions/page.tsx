/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PageTransition } from "@/components/page-transition";
import { SummaryCards } from "@/components/summary-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Fingerprint,
  Loader2,
  Receipt,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [selectedFilialId, setSelectedFilialId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("USER");
  const [stats, setStats] = useState<any>(null);

  const loadInitialData = async () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("@payvex:user") || "{}",
      );
      setUserRole(savedUser.role);

      const res = await api.get(`/companies/${savedUser.companyId}`);
      const todasFiliais = res.data.filiais || [];

      if (savedUser.role === "USER" && savedUser.filialId) {
        const filialVinculada = todasFiliais.filter(
          (f: any) => f.id === savedUser.filialId,
        );
        setFiliais(filialVinculada);
        setSelectedFilialId(savedUser.filialId);
        loadTransactions(savedUser.filialId);
      } else {
        setFiliais(todasFiliais);
        loadTransactions("");
      }
    } catch (e) {
      toast.error("Erro ao carregar dados de acesso.");
    }
  };

  const loadTransactions = async (filialId: string) => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        api.get("/transactions", {
          params: { filialId: filialId || undefined },
        }),
        api.get("/transactions/stats", {
          params: { filialId: filialId || undefined },
        }),
      ]);

      setTransactions(res.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Erro ao carregar transações:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("ID copiado!", {
      style: { background: "#3a416f", color: "#fff", fontWeight: "bold" },
      icon: "📋",
    });
  };

  const downloadReceipt = async (txId: string) => {
    const t = toast.loading("Gerando comprovante premium...", { id: "pdf" });

    try {
      // 1. Localiza a transação e a filial correspondente
      const tx = transactions.find((item) => item.id === txId);
      if (!tx) throw new Error("Transação não encontrada");

      const filial = filiais.find((f) => f.id === tx.filialId);

      // 2. Configurações iniciais do PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Formatação de data e hora completa
      const dateStr = format(
        new Date(tx.createdAt),
        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
        { locale: ptBR },
      );

      // Definição da Identidade Visual Payvex
      const primaryRGB = { r: 58, g: 65, b: 111 }; // #3a416f
      const accentRGB = { r: 130, g: 214, b: 22 }; // #82d616
      const lightBg = { r: 248, g: 250, b: 252 }; // bg-slate-50

      // --- 1. CABEÇALHO MODERNO (IDENTIDADE PAYVEX) ---
      doc.setFillColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      doc.roundedRect(10, 10, pageWidth - 20, 35, 4, 4, "F");

      doc.setTextColor(accentRGB.r, accentRGB.g, accentRGB.b);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PAYVEX", 20, 32);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("COMPROVANTE DE OPERAÇÃO DIGITAL", pageWidth - 20, 25, {
        align: "right",
      });
      doc.setFont("courier", "normal");
      doc.text(`ID: ${tx.id.toUpperCase()}`, pageWidth - 20, 33, {
        align: "right",
      });

      // --- 2. DESTAQUE DO VALOR (CARD CENTRAL) ---
      doc.setFillColor(lightBg.r, lightBg.g, lightBg.b);
      doc.roundedRect(10, 50, pageWidth - 20, 45, 4, 4, "F");

      doc.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("VALOR TOTAL PROCESSADO (BRUTO)", pageWidth / 2, 65, {
        align: "center",
      });

      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      const formattedAmount = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(tx.amount));
      doc.text(formattedAmount, pageWidth / 2, 82, { align: "center" });

      // --- 3. DETALHES DA TRANSAÇÃO (LISTA LIMPA) ---
      const drawDetail = (label: string, value: string, y: number) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(120, 120, 120);
        doc.text(label, 20, y);

        doc.setFont("helvetica", "medium");
        doc.setTextColor(primaryRGB.r, primaryRGB.g, primaryRGB.b);
        doc.text(value, pageWidth - 20, y, { align: "right" });

        // Linha divisória sutil
        doc.setDrawColor(240, 240, 240);
        doc.line(20, y + 4, pageWidth - 20, y + 4);
      };

      let currentY = 110;
      drawDetail(
        "STATUS DA VENDA",
        tx.status === "PAID" ? "PAGO / CONFIRMADO" : tx.status,
        currentY,
      );
      currentY += 12;
      drawDetail("DATA E HORA DO PAGAMENTO", dateStr, currentY);
      currentY += 12;
      drawDetail("CLIENTE", tx.customerName.toUpperCase(), currentY);
      currentY += 12;
      drawDetail(
        "MÉTODO DE PAGAMENTO",
        tx.paymentMethod.replace("_", " "),
        currentY,
      );
      currentY += 12;
      drawDetail("GATEWAY DE PROCESSAMENTO", tx.gateway, currentY);
      currentY += 12;
      drawDetail("UNIDADE EMISSORA", filial?.name || "Matriz Payvex", currentY);
      currentY += 12;
      drawDetail("CNPJ EMISSOR", filial?.cnpj || "N/A", currentY);

      // --- 4. BLOCO FINANCEIRO (VALOR LÍQUIDO) ---
      if (tx.netAmount) {
        currentY += 15;
        doc.setFillColor(240, 253, 244); // bg-emerald-50
        doc.roundedRect(15, currentY - 6, pageWidth - 30, 20, 2, 2, "F");

        doc.setFontSize(9);
        doc.setTextColor(21, 128, 61); // emerald-700
        const netStr = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(Number(tx.netAmount));
        doc.text(`Valor Líquido Recebido: ${netStr}`, 22, currentY + 7);
      }

      // --- 5. RODAPÉ DE SEGURANÇA ---
      const footerY = 270;
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.text(
        "AUTENTICAÇÃO MECÂNICA VIA PROTOCOLO PAYVEX CLOUD",
        pageWidth / 2,
        footerY,
        { align: "center" },
      );
      doc.text(
        "Este documento possui validade jurídica como comprovante de pagamento eletrônico.",
        pageWidth / 2,
        footerY + 4,
        { align: "center" },
      );

      // Marca d'água de segurança
      doc.setDrawColor(accentRGB.r, accentRGB.g, accentRGB.b);
      doc.setLineWidth(0.5);
      doc.circle(pageWidth - 25, footerY, 8, "S");
      doc.setFontSize(6);
      doc.text("SECURE", pageWidth - 25, footerY + 1, { align: "center" });

      // 3. Finalização e Download
      doc.save(`payvex-receipt-${tx.id.substring(0, 8)}.pdf`);

      toast.success("Comprovante premium gerado!", { id: "pdf" });
    } catch (error: any) {
      console.error(error);
      toast.error("Falha ao gerar o documento PDF.");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      PAID: "bg-[#82d616]/10 text-[#82d616] border-[#82d616]/20",
      PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return (
      <Badge
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 font-bold border",
          styles[status],
        )}
      >
        {status === "PAID" ? (
          <CheckCircle2 size={12} />
        ) : status === "PENDING" ? (
          <Clock size={12} />
        ) : (
          <XCircle size={12} />
        )}
        {status}
      </Badge>
    );
  };

  return (
    <PageTransition>
      <div className="max-w-[1200px] mx-auto space-y-8 pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#3a416f]/60 font-semibold text-sm uppercase tracking-widest">
              <Receipt size={16} />
              <span>Extrato de Operações</span>
            </div>
            <h1 className="text-4xl font-extrabold text-[#3a416f]">
              Vendas e <span className="text-[#82d616]">Recebíveis</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={cn(
                "bg-white p-2 rounded-xl border flex items-center gap-2 shadow-sm min-w-[280px]",
                userRole === "USER" && "bg-slate-50 opacity-80",
              )}
            >
              <select
                className="bg-transparent text-sm font-bold text-[#3a416f] outline-none pr-4 cursor-pointer w-full disabled:cursor-not-allowed"
                value={selectedFilialId}
                disabled={userRole === "USER"}
                onChange={(e) => {
                  setSelectedFilialId(e.target.value);
                  loadTransactions(e.target.value);
                }}
              >
                {userRole === "ADMIN" && (
                  <option value="">Todas as Unidades</option>
                )}
                {filiais.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.isActive ? "🟢 " : "🔴 "} {f.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 shadow-sm"
              onClick={() => loadTransactions(selectedFilialId)}
            >
              <RefreshCcw
                size={18}
                className={cn(loading && "animate-spin text-[#82d616]")}
              />
            </Button>
          </div>
        </header>

        <SummaryCards
          totalApproved={stats?.totalNet || 0}
          totalPending={stats?.pendingAmount || 0}
          transactionCount={transactions.length}
        />

        <div className="bg-white rounded-[1rem] border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Data / Hora
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Identificador
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Titular
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Gateway
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Vlr. Bruto
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-[#3a416f] uppercase tracking-widest">
                    Vlr. Líquido
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Opções
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {!loading && transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#82d616]/5 transition-all group"
                    >
                      {/* COLUNA DATA E HORA */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold text-[#3a416f]">
                            {format(new Date(tx.createdAt), "dd/MM/yy")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {format(new Date(tx.createdAt), "HH:mm")}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <button
                          onClick={() => copyToClipboard(tx.id)}
                          className="flex items-center gap-2 group/id cursor-pointer bg-slate-50 hover:bg-white border border-slate-100 px-2 py-1 rounded-md transition-all"
                        >
                          <Fingerprint
                            size={14}
                            className="text-slate-300 group-hover/id:text-[#82d616]"
                          />
                          <code className="text-[10px] font-mono text-slate-400">
                            {tx.id.substring(0, 8)}...
                          </code>
                          <Copy
                            size={12}
                            className="text-slate-300 opacity-0 group-hover/id:opacity-100"
                          />
                        </button>
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-[#3a416f]">
                        {tx.customerName}
                      </td>
                      <td className="px-6 py-5">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-tighter"
                        >
                          {tx.gateway}
                        </Badge>
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-400">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(tx.amount)}
                      </td>

                      <td className="px-6 py-5 font-black text-[#3a416f]">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(tx.netAmount)}
                      </td>

                      <td className="px-6 py-5">{getStatusBadge(tx.status)}</td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(tx.id)}
                            className="h-8 w-8 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            title="Baixar Comprovante"
                          >
                            <Download size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-20">
                      {loading ? (
                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-[#82d616]" />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Calendar size={32} className="opacity-20" />
                          <p className="italic">Nenhum registro encontrado.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
