"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface DeleteApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  keyName: string;
}

export function DeleteApiKeyModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  keyName,
}: DeleteApiKeyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] border-none bg-white rounded-[2rem] shadow-2xl p-0 overflow-hidden">
        <div className="bg-red-50 p-6 flex justify-center border-b border-red-100">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-red-200 text-red-500 animate-pulse">
            <AlertTriangle size={32} />
          </div>
        </div>

        <div className="p-8 space-y-4 text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-surface leading-tight">
              Revogar Chave <br />
              <span className="text-red-500">API?</span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium text-sm pt-2">
              Você está prestes a desativar a chave {`"`}{keyName}{`"`}. Isso
              interromperá imediatamente todas as integrações vinculadas a ela.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl uppercase font-black text-[10px] tracking-widest text-slate-400 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-surface text-white hover:bg-red-600 rounded-xl uppercase font-black text-[10px] tracking-widest shadow-lg shadow-red-200 transition-all gap-2"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Trash2 size={14} /> Revogar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
