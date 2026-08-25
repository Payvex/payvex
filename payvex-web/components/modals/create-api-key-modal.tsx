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
import { AlertCircle, Copy, Download, Key, Loader2 } from "lucide-react";
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
  const [generatedWebhookSecret, setGeneratedWebhookSecret] = useState<
    string | null
  >(null);

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
      setGeneratedWebhookSecret(res.data.webhookSecret);
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

  const copyWebhookSecret = () => {
    if (generatedWebhookSecret) {
      navigator.clipboard.writeText(generatedWebhookSecret);
      toast.success("Webhook secret copiado!");
    }
  };

  const downloadJson = () => {
    if (!generatedKey) return;

    const selectedFilial = filiais.find((filial) => filial.id === filialId);
    const payload = {
      type: "payvex_service_account",
      name,
      filialId,
      filialName: selectedFilial?.name || null,
      apiKey: generatedKey,
      webhookSecret: generatedWebhookSecret,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (name || "payvex-api-key")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    link.href = url;
    link.download = `${safeName || "payvex-api-key"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON baixado.");
  };

  const handleCloseInternal = () => {
    setGeneratedKey(null);
    setGeneratedWebhookSecret(null);
    setName("");
    setFilialId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseInternal}>
      <DialogContent className="sm:max-w-[450px] border-none shadow-2xl rounded-2xl bg-surface text-white">
        <DialogHeader>
          <DialogTitle className="text-primary font-black flex items-center gap-2">
            <Key size={20} />
            {generatedKey ? "Chave Gerada!" : "Nova Integração"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
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
                className="bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-400 focus:border-primary"
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
                className="flex h-10 w-full rounded-xl border border-slate-600 bg-[#1a1f2e] px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#82d616]/20 transition-all"
                value={filialId}
                onChange={(e) => setFilialId(e.target.value)}
              >
                <option value="" className="text-slate-500">
                  Selecione a filial...
                </option>
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
            <div className="p-4 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-600 relative group">
              <p className="text-[9px] uppercase font-black text-slate-400 mb-2">
                Sua API Key (Live)
              </p>
              <code className="text-xs font-mono text-primary break-all block pr-10 leading-relaxed">
                {generatedKey}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyKey}
                className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-surface"
              >
                <Copy size={14} />
              </Button>
            </div>
            {generatedWebhookSecret && (
              <div className="p-4 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-600 relative group">
                <p className="text-[9px] uppercase font-black text-slate-400 mb-2">
                  Webhook Secret
                </p>
                <code className="text-xs font-mono text-primary break-all block pr-10 leading-relaxed">
                  {generatedWebhookSecret}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyWebhookSecret}
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-surface"
                >
                  <Copy size={14} />
                </Button>
              </div>
            )}
            <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex gap-3">
              <AlertCircle className="text-amber-400 shrink-0" size={16} />
              <p className="text-[10px] text-amber-300 leading-relaxed">
                <b>Importante:</b> Salve esta chave em um local seguro. Ela
                concede acesso total às operações financeiras desta filial. O
                Webhook Secret valida os callbacks recebidos pelo plugin.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={downloadJson}
              className="w-full rounded-xl border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-surface"
            >
              <Download size={14} />
              Baixar credenciais JSON
            </Button>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <div className="flex w-full gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="flex-1 rounded-xl font-bold uppercase text-[10px] text-slate-400 hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-primary text-surface font-black uppercase text-[10px] shadow-lg"
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
              className="w-full bg-primary text-surface font-black uppercase text-[10px] hover:bg-primary-dark"
            >
              Concluído
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
