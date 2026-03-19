"use client";

import { Clock, Hash, TrendingUp } from "lucide-react";

interface SummaryProps {
  totalApproved: number;
  totalPending: number;
  transactionCount: number;
}

export function SummaryCards({
  totalApproved,
  totalPending,
  transactionCount,
}: SummaryProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* CARD 1: TOTAL APROVADO */}
      <div className=" p-8 rounded-[1rem] border border-white/5 flex flex-col items-center justify-center space-y-2 shadow-xl">
        <TrendingUp className="text-[#82d616] h-6 w-6" />
        <span className="text-2xl font-black text-[#1a1f2e]">
          {formatCurrency(totalApproved)}
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Total Aprovado
        </span>
      </div>

      {/* CARD 2: PENDENTES */}
      <div className="p-8 rounded-[1rem] border border-white/5 flex flex-col items-center justify-center space-y-2 shadow-xl">
        <Clock className="text-slate-400 h-6 w-6" />
        <span className="text-2xl font-black text-[#1a1f2e]">
          {formatCurrency(totalPending)}
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Pendentes
        </span>
      </div>

      {/* CARD 3: TOTAL TRANSAÇÕES */}
      <div className="p-8 rounded-[1rem] border border-white/5 flex flex-col items-center justify-center space-y-2 shadow-xl">
        <div className="flex items-center gap-2">
          <Hash className="text-[#82d616] h-6 w-6" />
          <span className="text-2xl font-black text-[#82d616]">
            {transactionCount}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
          Transações
        </span>
      </div>
    </div>
  );
}
