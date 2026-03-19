 
"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

interface DeleteFilialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  filialName: string;
}

export function DeleteFilialModal({
  isOpen,
  onClose,
  onConfirm,
  filialName,
}: DeleteFilialModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#3a416f]/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200 border border-slate-200">
        <div className="p-8 text-center">
          {/* Ícone de Alerta Payvex Style */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-50 mb-6 border-4 border-white shadow-sm">
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>

          <h3 className="text-2xl font-black text-[#3a416f] mb-2 tracking-tight">
            Desativar Unidade?
          </h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Você está prestes a desativar a filial{" "}
            <strong className="text-[#3a416f] font-bold">{filialName}</strong>.
            Os dados históricos serão mantidos, mas ela não poderá mais
            processar vendas.
          </p>

          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              onClick={handleConfirm}
              className="flex-1 px-4 py-3 rounded-xl bg-[#82d616] text-[#3a416f] font-black hover:bg-[#74c014] transition-all shadow-lg shadow-[#82d616]/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Trash2 size={18} /> Confirmar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
