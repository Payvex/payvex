 
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import {
    AlertCircle,
    Copy,
    Key,
    Loader2
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  filiais: any[];
  onSuccess: () => void;
}

export function CreateApiKeyModal({
  isOpen,
  onClose,
  filiais,
  onSuccess,
}: CreateApiKeyModalProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [filialId, setFilialId] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name || !filialId) {
      return toast.error("Preencha o nome e selecione uma unidade.");
    }

    setLoading(true);
    try {
      const res = await api.post("/identity/api-keys", {
        name,
        filialId,
      });

      setGeneratedKey(res.data.key);
      toast.success("Chave gerada com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao gerar chave.");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success("Copiado!");
    }
  };

  const handleCloseInternal = () => {
    setGeneratedKey(null);
    setName("");
    setFilialId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseInternal}>
      <DialogContent className="sm:max-w-[450px] bg-white border-none shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#3a416f] font-black flex items-center gap-2">
            <Key className="text-[#82d616]" size={20} />
            {generatedKey ? "Chave Gerada!" : "Nova Integração"}
          </DialogTitle>
          <DialogDescription className="text-slate-500 text-xs">
            {generatedKey
              ? "Copie sua chave agora. Por segurança, ela não será exibida novamente."
              : "Crie uma chave de acesso para conectar seu e-commerce à Payvex."}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-[10px] uppercase font-black text-slate-400"
              >
                Nome da Conexão
              </Label>
              <Input
                id="name"
                placeholder="Ex: WordPress Loja 01"
                className="rounded-xl border-slate-200 focus:border-[#82d616] transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="filial"
                className="text-[10px] uppercase font-black text-slate-400"
              >
                Unidade de Recebimento
              </Label>
              <select
                id="filial"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#82d616]/20 transition-all"
                value={filialId}
                onChange={(e) => setFilialId(e.target.value)}
              >
                <option value="">Selecione a filial...</option>
                {filiais.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 relative group">
              <p className="text-[9px] uppercase font-black text-slate-400 mb-2">
                Sua API Key (Live)
              </p>
              <code className="text-xs font-mono text-[#3a416f] break-all block pr-10 leading-relaxed">
                {generatedKey}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyKey}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full hover:bg-[#82d616] hover:text-[#3a416f]"
              >
                <Copy size={14} />
              </Button>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3">
              <AlertCircle className="text-amber-500 shrink-0" size={16} />
              <p className="text-[10px] text-amber-700 leading-relaxed">
                <b>Importante:</b> Salve esta chave em um local seguro. Ela
                concede acesso total às operações financeiras desta filial.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <div className="flex w-full gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 rounded-xl font-bold uppercase text-[10px]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-[#3a416f] text-white hover:bg-[#82d616] hover:text-[#3a416f] rounded-xl font-bold uppercase text-[10px] shadow-lg shadow-[#3a416f]/10"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Gerar Chave"
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCloseInternal}
              className="w-full bg-[#82d616] text-[#3a416f] hover:bg-[#3a416f] hover:text-white rounded-xl font-black uppercase text-[10px] transition-all"
            >
              Concluído
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
