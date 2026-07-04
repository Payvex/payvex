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
import { Globe, Loader2, Unplug, Webhook } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface ManageWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiKey: {
    id: string;
    name: string;
    webhookUrl?: string | null;
  } | null;
}

export function ManageWebhookModal({
  isOpen,
  onClose,
  onSuccess,
  apiKey,
}: ManageWebhookModalProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setWebhookUrl(apiKey?.webhookUrl || "");
  }, [apiKey]);

  const handleSave = async () => {
    if (!apiKey) return;

    setLoading(true);
    try {
      await api.patch(`/identity/keys/${apiKey.id}/webhook`, {
        webhookUrl: webhookUrl.trim(),
      });

      toast.success("Webhook atualizado com sucesso.");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao atualizar o webhook.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!apiKey) return;

    setRemoving(true);
    try {
      await api.patch(`/identity/keys/${apiKey.id}/webhook`, {});
      toast.success("Webhook removido com sucesso.");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erro ao remover o webhook.",
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-[2rem] border-none bg-white p-0 shadow-2xl overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#82d616]/10 text-[#3a416f]">
              <Webhook size={26} />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-[#3a416f]">
                Configurar Webhook
              </DialogTitle>
              <DialogDescription className="pt-1 text-sm text-slate-500">
                Defina a URL de callback da integração{" "}
                <strong className="text-[#3a416f]">{apiKey?.name}</strong>.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-8">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            <p className="font-semibold text-[#3a416f]">Fluxo recomendado</p>
            <p className="mt-1 leading-6">
              O plugin pode registrar essa URL automaticamente. Esta tela serve
              como fallback manual para revisão, edição ou suporte.
            </p>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="webhookUrl"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              Webhook URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 h-4 w-4 text-[#82d616]" />
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://loja.com/wp-json/payvex/v1/webhook"
                className="h-12 rounded-2xl border-slate-200 pl-10"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Exemplo para WooCommerce:
              ` /wp-json/payvex/v1/webhook`
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t border-slate-100 bg-white p-6 sm:flex-row sm:justify-between sm:space-x-0">
          <Button
            variant="ghost"
            onClick={handleRemove}
            disabled={removing || loading || !apiKey?.webhookUrl}
            className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50"
          >
            {removing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Unplug size={14} />
                Remover Webhook
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading || removing}
              className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || removing || !webhookUrl.trim()}
              className="rounded-xl bg-[#3a416f] text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#82d616] hover:text-[#3a416f]"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Salvar Webhook"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
