"use client";

import {
  Button,
} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Copy, Globe, KeyRound, Loader2, Unplug, Webhook } from "lucide-react";
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
  const [rotating, setRotating] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState("");

  useEffect(() => {
    setWebhookUrl(apiKey?.webhookUrl || "");
    setGeneratedSecret("");
  }, [apiKey]);

  const handleSave = async (): Promise<void> => {
    if (!apiKey) return;

    setLoading(true);
    try {
      await api.patch(`/identity/keys/${apiKey.id}/webhook`, {
        webhookUrl: webhookUrl.trim(),
      });

      toast.success("Webhook atualizado com sucesso.");
      onSuccess();
      onClose();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Erro ao atualizar o webhook.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (!apiKey) return;

    setRemoving(true);
    try {
      await api.patch(`/identity/keys/${apiKey.id}/webhook`, {});

      toast.success("Webhook removido com sucesso.");
      onSuccess();
      onClose();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Erro ao remover o webhook.";

      toast.error(message);
    } finally {
      setRemoving(false);
    }
  };

  const handleRotateSecret = async (): Promise<void> => {
    if (!apiKey) return;

    setRotating(true);
    try {
      const response = await api.post(
        `/identity/keys/${apiKey.id}/webhook/rotate-secret`,
      );

      setGeneratedSecret(response.data?.webhookSecret || "");
      toast.success("Webhook Secret gerado com sucesso.");
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Erro ao gerar Webhook Secret.";

      toast.error(message);
    } finally {
      setRotating(false);
    }
  };

  const copySecret = async (): Promise<void> => {
    if (!generatedSecret) return;
    await navigator.clipboard.writeText(generatedSecret);
    toast.success("Webhook Secret copiado.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] rounded-[2rem] border-none bg-surface text-white shadow-2xl overflow-hidden">
        <div className="border-b border-slate-700 bg-slate-800/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Webhook size={26} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white">
                Configurar Webhook
              </DialogTitle>
              <DialogDescription className="pt-1 text-sm text-slate-400">
                Defina a URL de callback da integração{" "}
                <strong className="text-primary">{apiKey?.name}</strong>.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-4 text-sm text-slate-400">
            <p className="font-semibold text-white">Fluxo recomendado</p>
            <p className="mt-1 leading-6">
              O plugin pode registrar essa URL automaticamente. Esta tela serve
              como fallback manual para revisão, edição ou suporte.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  Webhook Secret
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Use este secret no plugin para validar callbacks do Payvex.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRotateSecret}
                disabled={rotating || !apiKey}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700"
              >
                {rotating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <KeyRound size={14} />
                    Gerar
                  </>
                )}
              </Button>
            </div>

            {generatedSecret && (
              <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-slate-900/60 p-3">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Copie agora
                </p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all text-xs text-primary">
                    {generatedSecret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-primary hover:text-surface"
                    title="Copiar Webhook Secret"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="webhookUrl"
              className="text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              Webhook URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 h-4 w-4 text-primary" />
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://loja.com/wp-json/payvex/v1/webhook"
                className="h-12 rounded-2xl border-slate-600 bg-[#1a1f2e] pl-10 text-white placeholder:text-slate-400 focus:border-primary focus:ring-primary"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <p className="text-xs leading-5 text-slate-400">
              Exemplo para WooCommerce:
              <code className="text-primary">
                {" /wp-json/payvex/v1/webhook"}
              </code>
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-3 border-t border-slate-700 bg-slate-800/30 p-6 sm:flex-row">
          <Button
            variant="ghost"
            onClick={handleRemove}
            disabled={removing || loading || !apiKey?.webhookUrl}
            className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700"
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
              className="rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || removing || !webhookUrl.trim()}
              className="rounded-xl bg-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark"
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
