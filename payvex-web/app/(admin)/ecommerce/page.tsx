/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CreateApiKeyModal } from "@/components/modals/create-api-key-modal";
import { DeleteApiKeyModal } from "@/components/modals/delete-api-key-modal";
import { ManageWebhookModal } from "@/components/modals/manage-webhook-modal";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Code2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Plus,
  Puzzle,
  ShieldCheck,
  Trash2,
  Unplug,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

const plugins = [
  {
    name: "WooCommerce",
    version: "0.1.0",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/woocommerce.svg",
    status: "Estável",
  },
  {
    name: "Shopify (Bridge)",
    version: "2.1.0",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/shopify.svg",
    status: "Beta",
  },
  {
    name: "Nuvemshop",
    version: "1.0.0",
    icon: "https://www.nuvemshop.com.br/favicon.ico",
    status: "Em Breve",
  },
];

export default function DevelopersPage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [keyToWebhook, setKeyToWebhook] = useState<{
    id: string;
    name: string;
    webhookUrl?: string | null;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("@payvex:user") || "{}",
      );
      const companyId = savedUser.companyId;
      if (!companyId) return;

      const response = await api.get(`/identity/keys/${companyId}`);
      setApiKeys(Array.isArray(response.data) ? response.data : []);

      const companyRes = await api.get(`/companies/${companyId}`);
      setFiliais(companyRes.data.filiais || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao sincronizar dados com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Chave copiada!", {
      style: { background: "#3a416f", color: "#fff" },
      icon: "📋",
    });
  };

  const handleConfirmRevoke = async () => {
    if (!keyToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/identity/keys/${keyToDelete.id}`);
      toast.success("Chave revogada com sucesso.");
      setIsDeleteModalOpen(false);
      loadData();
    } catch (error) {
      toast.error("Erro ao revogar chave.");
    } finally {
      setIsDeleting(false);
      setKeyToDelete(null);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-10 pb-20">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#82d616] font-bold text-xs uppercase tracking-widest">
              <Code2 size={16} /> Central do Desenvolvedor
            </div>
            <h1 className="text-4xl font-black text-[#3a416f]">
              Integrações & <span className="text-[#82d616]">Plugins</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Conecte sua loja e configure webhooks de pagamento.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl gap-2 font-bold uppercase text-[10px] border-slate-200"
            >
              <Webhook size={14} className="text-[#82d616]" /> Webhooks
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#3a416f] text-white hover:bg-[#2a3052] rounded-xl gap-2 font-bold uppercase text-[10px] shadow-lg"
            >
              <Plus size={14} /> Nova API Key
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <h2 className="text-[#3a416f] font-black flex items-center gap-2 text-xs uppercase tracking-tighter">
                  <Key size={16} className="text-[#82d616]" /> Chaves de Acesso
                  Ativas
                </h2>
              </div>

              <div className="p-0">
                {loading ? (
                  <div className="p-10 flex justify-center">
                    <Loader2 className="animate-spin text-[#82d616]" />
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 font-black border-b border-slate-50 bg-slate-50/30">
                          <th className="px-6 py-4">Nome da Aplicação</th>
                          <th className="px-6 py-4">Unidade / Filial</th>
                          <th className="px-6 py-4">Token (Key)</th>
                          <th className="px-6 py-4">Webhook</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {apiKeys.map((key) => (
                          <tr
                            key={key.id}
                            className="group hover:bg-[#82d616]/5 transition-all"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-[#3a416f]">
                                {key.name}
                              </p>
                              <span
                                className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                                  key.isActive
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-700",
                                )}
                              >
                                {key.isActive ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Globe size={12} className="text-slate-300" />
                                <span className="text-[10px] font-black text-slate-500 uppercase">
                                  {key.filial?.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <code className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono border border-slate-200">
                                  {key.key.substring(0, 14)}...
                                </code>
                                <button
                                  onClick={() => copyToClipboard(key.key)}
                                  className="p-1.5 text-slate-300 hover:text-[#82d616] transition-colors"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase",
                                    key.webhookUrl
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700",
                                  )}
                                >
                                  {key.webhookUrl
                                    ? "Webhook configurado"
                                    : "Webhook pendente"}
                                </span>
                                <p className="max-w-[220px] truncate text-[10px] text-slate-400">
                                  {key.webhookUrl ||
                                    "O plugin pode registrar automaticamente ou você pode cadastrar manualmente."}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  disabled={!key.isActive}
                                  onClick={() => {
                                    setKeyToWebhook({
                                      id: key.id,
                                      name: key.name,
                                      webhookUrl: key.webhookUrl,
                                    });
                                    setIsWebhookModalOpen(true);
                                  }}
                                  className={cn(
                                    "p-2 transition-all",
                                    key.isActive
                                      ? "text-slate-300 hover:text-[#82d616] opacity-0 group-hover:opacity-100 cursor-pointer"
                                      : "text-slate-200 opacity-50 cursor-not-allowed",
                                  )}
                                  title="Configurar webhook"
                                >
                                  {key.webhookUrl ? (
                                    <Unplug size={16} />
                                  ) : (
                                    <Webhook size={16} />
                                  )}
                                </button>
                                <button
                                  disabled={!key.isActive}
                                  onClick={() => {
                                    setKeyToDelete({
                                      id: key.id,
                                      name: key.name,
                                    });
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className={cn(
                                    "p-2 transition-all",
                                    key.isActive
                                      ? "text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer"
                                      : "text-slate-200 opacity-50 cursor-not-allowed",
                                  )}
                                  title="Revogar chave"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-400 italic text-sm">
                    Nenhuma chave encontrada.
                  </div>
                )}
              </div>
            </section>

            <section className="bg-[#3a416f] rounded-[2rem] p-10 text-white relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700">
                <Code2 size={180} />
              </div>
              <h3 className="text-2xl font-black mb-3 tracking-tight">
                API Documentation
              </h3>
              <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
                Contrato técnico do plugin, headers, payloads, webhooks e fluxo
                WooCommerce em uma única central.
              </p>
              <div className="flex gap-4">
                <Link href="/docs">
                  <Button className="bg-[#82d616] text-[#3a416f] font-black rounded-xl gap-2 text-[10px] uppercase h-12 px-8 hover:bg-white transition-all shadow-lg">
                    Ver Documentação <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <h2 className="text-[#3a416f] font-black text-[10px] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <Puzzle size={14} className="text-[#82d616]" /> E-commerce Plugins
            </h2>
            <div className="grid gap-3">
              {plugins.map((plugin) => (
                <Card
                  key={plugin.name}
                  className="border-slate-200 overflow-hidden group hover:border-[#82d616] transition-all"
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100">
                        <img
                          src={plugin.icon}
                          alt={plugin.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#3a416f] uppercase">
                          {plugin.name}
                        </p>
                        <span className="text-[9px] font-bold text-slate-400">
                          v{plugin.version}
                        </span>
                      </div>
                    </div>
                    <button
                      className="h-8 w-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-[#82d616] hover:text-[#3a416f] disabled:opacity-20 transition-all border border-slate-100"
                      onClick={() => {
                        if (plugin.status === "Em Breve") return;
                        window.location.href = "/docs";
                      }}
                      disabled={plugin.status === "Em Breve"}
                    >
                      <Download size={14} />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="bg-[#1a1f2e] rounded-3xl p-6 text-white border border-white/5 relative overflow-hidden shadow-2xl group mt-4">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[#82d616] rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative z-10">
                <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-[#82d616]/50 transition-colors">
                  <ShieldCheck className="text-[#82d616]" size={24} />
                </div>
                <h4 className="text-sm font-black uppercase mb-3 tracking-widest text-[#82d616]">
                  Dev Support
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-8">
                  Dificuldades na instalação? Auxiliamos via WhatsApp.
                </p>
                <Button
                  className="w-full bg-white/5 hover:bg-[#82d616] hover:text-[#3a416f] text-white font-black text-[10px] uppercase h-12 rounded-2xl transition-all border border-white/10 shadow-inner"
                  onClick={() => window.open("https://wa.me/suporte", "_blank")}
                >
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </div>
        </div>

        <CreateApiKeyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          filiais={filiais}
          onSuccess={loadData}
        />
        <DeleteApiKeyModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmRevoke}
          loading={isDeleting}
          keyName={keyToDelete?.name || ""}
        />
        <ManageWebhookModal
          isOpen={isWebhookModalOpen}
          onClose={() => setIsWebhookModalOpen(false)}
          onSuccess={loadData}
          apiKey={keyToWebhook}
        />
      </div>
    </PageTransition>
  );
}
