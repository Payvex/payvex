/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { CreateApiKeyModal } from "@/components/modals/create-api-key-modal";
import { DeleteApiKeyModal } from "@/components/modals/delete-api-key-modal";
import { ManageWebhookModal } from "@/components/modals/manage-webhook-modal";
import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import {
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Key,
  Loader2,
  Plus,
  Puzzle,
  Settings,
  ShieldCheck,
  Trash2,
  Unplug,
  Webhook,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

// 📦 PLUGINS E-COMMERCE
const plugins = [
  {
    id: "woocommerce",
    name: "WooCommerce",
    version: "0.1.0",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/woocommerce.svg",
    status: "Estável",
    credentialFields: [
      "woocommerceUrl",
      "woocommerceConsumerKey",
      "woocommerceConsumerSecret",
    ],
  },
  {
    id: "shopify",
    name: "Shopify (Bridge)",
    version: "2.1.0",
    icon: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/shopify.svg",
    status: "Beta",
    credentialFields: ["shopifyUrl", "shopifyAccessToken"],
  },
  {
    id: "nuvem-shop",
    name: "Nuvemshop",
    version: "1.0.0",
    icon: "https://www.nuvemshop.com.br/favicon.ico",
    status: "Beta",
    credentialFields: ["nuvemShopAccessToken", "nuvemShopStoreId"],
  },
];

// 💳 GATEWAYS DE PAGAMENTO - refletindo o backend
const paymentGateways = [
  {
    id: "stripe",
    name: "Stripe",
    category: "Pagamentos Internacionais",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/stripe.svg",
    credentialFields: ["stripeSecretKey"],
    webhookField: "stripeWebhookSecret",
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    category: "América Latina",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/mercadopago.svg",
    credentialFields: ["mercadoPagoAccessToken"],
    webhookField: null,
  },
  {
    id: "pagarme",
    name: "Pagar.me",
    category: "Recorrência e Split",
    logo: "https://www.pagar.me/favicon.ico",
    credentialFields: ["pagarMeAccessToken"],
    webhookField: null,
  },
  {
    id: "pagbank",
    name: "PagBank",
    category: "Banco Digital",
    logo: "/icons/pagbank-logo.png",
    credentialFields: ["pagarBankPrivateKey"],
    webhookField: null,
  },
  {
    id: "asaas",
    name: "Asaas",
    category: "Pagamentos Brasileiros",
    logo: "https://asaas.com.br/favicon.ico",
    credentialFields: ["asaasApiKey"],
    webhookField: null,
  },
  {
    id: "cielo",
    name: "Cielo",
    category: "Adquirente Nacional",
    logo: "https://logodownload.org/wp-content/uploads/2014/07/cielo-logo-1.png",
    credentialFields: ["cieloMerchantId", "cieloMerchantKey"],
    webhookField: null,
  },
  {
    id: "stone",
    name: "Stone",
    category: "Adquirente Nacional",
    logo: "https://www.stone.com.br/favicon.ico",
    credentialFields: ["stoneApiKey"],
    webhookField: null,
  },
  {
    id: "nowpayments",
    name: "NOWPayments",
    category: "Criptomoedas",
    logo:
      "https://v3b.fal.media/files/b/0aa76770/37a0gmuxSn3xXC8LwAebM_RhB58Zyb.png",
    credentialFields: ["nowPaymentsApiKey"],
    webhookField: null,
  },
  {
    id: "coinbasecommerce",
    name: "Coinbase Commerce",
    category: "Criptomoedas",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/coinbase.svg",
    credentialFields: ["coinbaseCommerceApiKey"],
    webhookField: "coinbaseCommerceWebhookSecret",
  },
  {
    id: "bitpay",
    name: "BitPay",
    category: "Criptomoedas",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/bitpay.svg",
    credentialFields: ["bitPayToken"],
    webhookField: null,
  },
  {
    id: "picpay",
    name: "PicPay",
    category: "Carteira Digital",
    logo: "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/picpay.svg",
    credentialFields: ["picPayClientSecret", "picPayPublicKey"],
    webhookField: null,
  },
  {
    id: "pagseguro",
    name: "PagSeguro",
    category: "Pagamentos Brasileiros",
    logo:
      "https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/pagseguro.svg",
    credentialFields: ["pagSeguroEmail", "pagSeguroToken"],
    webhookField: null,
  },
];

export default function EcommercePage() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilialId, setSelectedFilialId] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [ecommerceConfigOpen, setEcommerceConfigOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<any | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [ecommerceForm, setEcommerceForm] = useState({
    shopifyUrl: "",
    shopifyAccessToken: "",
    shopifyStoreId: "",
    shopifyApiVersion: "2026-07",
    nuvemShopAccessToken: "",
    nuvemShopStoreId: "",
    nuvemShopDomain: "",
    woocommerceUrl: "",
    woocommerceConsumerKey: "",
    woocommerceConsumerSecret: "",
  });
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

  // 🔍 VERIFICA SE O GATEWAY ESTÁ CONECTADO NA FILIAl
  const isGatewayConnected = (filial: any, gateway: any) => {
    if (!filial || !gateway.credentialFields) return false;
    return gateway.credentialFields.some(
      (field: string) =>
        filial[field] !== null && filial[field] !== undefined,
    );
  };

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
      const loadedFiliais = companyRes.data.filiais || [];
      setFiliais(loadedFiliais);
      if (!selectedFilialId && loadedFiliais[0]?.id) {
        setSelectedFilialId(loadedFiliais[0].id);
      }
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

  const handleCopyApiKey = async (key: any) => {
    if (key.key) {
      copyToClipboard(key.key);
      return;
    }

    toast.custom(
      (t) => (
        <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-4 text-surface shadow-2xl">
          <p className="text-sm font-black">Gerar nova API Key?</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            A chave completa só é exibida uma vez. A chave antiga deixará de
            funcionar.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100"
              onClick={() => toast.dismiss(t.id)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="rounded-lg bg-surface px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-surface-hover"
              onClick={() => {
                toast.dismiss(t.id);
                rotateAndCopyApiKey(key);
              }}
            >
              Gerar e copiar
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  const rotateAndCopyApiKey = async (key: any) => {
    setRotatingKeyId(key.id);
    try {
      const response = await api.post(`/identity/keys/${key.id}/rotate-key`);
      const newKey = response.data?.key;

      if (newKey) {
        await navigator.clipboard.writeText(newKey);
        toast.success("Nova API Key gerada e copiada.");
      }

      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Erro ao gerar nova API Key.",
      );
    } finally {
      setRotatingKeyId(null);
    }
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

  const selectedFilial =
    filiais.find((filial) => filial.id === selectedFilialId) ||
    filiais[0] ||
    null;

  const openEcommerceConfig = (plugin: any) => {
    setSelectedPlugin(plugin);
    setEcommerceForm({
      shopifyUrl: "",
      shopifyAccessToken: "",
      shopifyStoreId: "",
      shopifyApiVersion: "2026-07",
      nuvemShopAccessToken: "",
      nuvemShopStoreId: "",
      nuvemShopDomain: "",
      woocommerceUrl: "",
      woocommerceConsumerKey: "",
      woocommerceConsumerSecret: "",
    });
    setEcommerceConfigOpen(true);
  };

  const updateEcommerceForm = (field: string, value: string) => {
    setEcommerceForm((current) => ({ ...current, [field]: value }));
  };

  const handleManualConnect = async () => {
    if (!selectedPlugin || !selectedFilial) return;
    setManualLoading(true);
    try {
      if (selectedPlugin.id === "woocommerce") {
        await api.post(
          `/filiais/${selectedFilial.id}/gateways/woocommerce/connect`,
          {
            url: ecommerceForm.woocommerceUrl,
            consumerKey: ecommerceForm.woocommerceConsumerKey,
            consumerSecret: ecommerceForm.woocommerceConsumerSecret,
          },
        );
      }

      if (selectedPlugin.id === "shopify") {
        await api.post(`/filiais/${selectedFilial.id}/gateways/shopify/connect`, {
          url: ecommerceForm.shopifyUrl,
          accessToken: ecommerceForm.shopifyAccessToken,
          storeId: ecommerceForm.shopifyStoreId || undefined,
          apiVersion: ecommerceForm.shopifyApiVersion || "2026-07",
        });
      }

      if (selectedPlugin.id === "nuvem-shop") {
        await api.post(`/filiais/${selectedFilial.id}/gateways/nuvem-shop/connect`, {
          accessToken: ecommerceForm.nuvemShopAccessToken,
          storeId: ecommerceForm.nuvemShopStoreId,
        });
      }

      toast.success(`${selectedPlugin.name} conectado com sucesso.`);
      setEcommerceConfigOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Erro ao conectar ${selectedPlugin.name}.`,
      );
    } finally {
      setManualLoading(false);
    }
  };

  const handleStartOAuth = async () => {
    if (!selectedPlugin || !selectedFilial) return;
    setOauthLoading(true);
    try {
      if (selectedPlugin.id === "woocommerce") {
        toast.error("WooCommerce usa credenciais REST, não OAuth.");
        setOauthLoading(false);
        return;
      }

      const endpoint =
        selectedPlugin.id === "shopify"
          ? `/filiais/${selectedFilial.id}/gateways/shopify/oauth/start`
          : `/filiais/${selectedFilial.id}/gateways/nuvem-shop/oauth/start`;
      const params =
        selectedPlugin.id === "shopify"
          ? { shop: ecommerceForm.shopifyUrl }
          : { storeDomain: ecommerceForm.nuvemShopDomain || undefined };
      const response = await api.get(endpoint, { params });
      if (response.data?.authorizationUrl) {
        window.location.href = response.data.authorizationUrl;
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Erro ao iniciar OAuth de ${selectedPlugin.name}.`,
      );
      setOauthLoading(false);
    }
  };

  const handleDisconnectEcommerce = async () => {
    if (!selectedPlugin || !selectedFilial) return;
    setManualLoading(true);
    try {
      const endpoint =
        selectedPlugin.id === "woocommerce"
          ? `/filiais/${selectedFilial.id}/gateways/woocommerce/disconnect`
          : selectedPlugin.id === "shopify"
          ? `/filiais/${selectedFilial.id}/gateways/shopify/disconnect`
          : `/filiais/${selectedFilial.id}/gateways/nuvem-shop/disconnect`;
      await api.post(endpoint);
      toast.success(`${selectedPlugin.name} desconectado.`);
      setEcommerceConfigOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          `Erro ao desconectar ${selectedPlugin.name}.`,
      );
    } finally {
      setManualLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-10 pb-20">
        {/* ═══ HEADER ═══ */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
              <Puzzle size={16} />
              Hub de Integrações
            </div>
            <h1 className="text-4xl font-black text-surface">
              E-commerce & <span className="text-primary">Pagamentos</span>
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Conecte sua loja e configure gateways de pagamento por filial.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="rounded-xl gap-2 font-bold uppercase text-[10px] border-slate-200"
            >
              <Webhook size={14} className="text-primary" />
              Webhooks
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-surface text-white hover:bg-surface-hover rounded-xl gap-2 font-bold uppercase text-[10px] shadow-lg"
            >
              <Plus size={14} /> Nova API Key
            </Button>
          </div>
        </header>

        {/* ═══ SELECTOR DE FILIAL ═══ */}
        {filiais.length > 1 && (
          <div className="flex items-center gap-3">
            <Globe size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-surface">
              Unidade:
            </span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-surface outline-none focus:border-primary"
              value={selectedFilial?.id || ""}
              onChange={(event) => setSelectedFilialId(event.target.value)}
            >
              {filiais.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ═══ COLUNA ESQUERDA (API Keys + Docs) ═══ */}
          <div className="lg:col-span-2 space-y-8">
            {/* API Keys */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <h2 className="text-surface font-black flex items-center gap-2 text-xs uppercase tracking-tighter">
                  <Key size={16} className="text-primary" />
                  Chaves de Acesso Ativas
                </h2>
              </div>

              <div className="p-0">
                {loading ? (
                  <div className="p-10 flex justify-center">
                    <Loader2 className="animate-spin text-primary" />
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
                            className="group hover:bg-primary/5 transition-all"
                          >
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-surface">
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
                                  {key.keyPreview || "px_live_..."}
                                </code>
                                <button
                                  onClick={() => handleCopyApiKey(key)}
                                  disabled={rotatingKeyId === key.id}
                                  className="p-1.5 text-slate-300 hover:text-primary disabled:cursor-wait disabled:opacity-50 transition-colors"
                                  title={
                                    key.key
                                      ? "Copiar API Key"
                                      : "Gerar nova API Key e copiar"
                                  }
                                >
                                  {rotatingKeyId === key.id ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Copy size={14} />
                                  )}
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
                                      ? "text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 cursor-pointer"
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

            {/* 📚 DOC */}
            <section className="bg-surface rounded-[2rem] p-10 text-white relative overflow-hidden group shadow-2xl">
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
                <Link href="/docs/integrations">
                  <Button className="bg-primary text-surface font-black rounded-xl gap-2 text-[10px] uppercase h-12 px-8 hover:bg-white transition-all shadow-lg">
                    Ver Documentação <ExternalLink size={14} />
                  </Button>
                </Link>
              </div>
            </section>
          </div>

          {/* ═══ COLUNA DIREITA (Gateways + Plugins) ═══ */}
          <div className="space-y-6">
            {/* 🎯 GATEWAYS DE PAGAMENTO */}
            <div>
              <h2 className="text-surface font-black text-[10px] uppercase tracking-[0.2em] ml-1 flex items-center gap-2 mb-4">
                <Globe size={14} className="text-primary" />
                Gateways de Pagamento
              </h2>
              <div className="grid gap-3">
                {paymentGateways.map((gateway) => {
                  const isConnected = selectedFilial
                    ? isGatewayConnected(selectedFilial, gateway)
                    : false;

                  return (
                    <Card
                      key={gateway.id}
                      className={cn(
                        "border-slate-200 overflow-hidden group transition-all",
                        isConnected
                          ? "border-primary/20 bg-primary/5"
                          : "hover:border-primary",
                      )}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center p-2 border border-slate-100">
                            <img
                              src={gateway.logo}
                              alt={gateway.name}
                              className="w-full h-full object-contain"
                              onError={(e: any) => {
                                e.currentTarget.src = `https://via.placeholder.com/40?text=${gateway.name.substring(0, 2)}`;
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-black text-surface uppercase">
                              {gateway.name}
                            </p>
                            <span className="text-[9px] font-bold text-slate-400">
                              {gateway.category}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <span className="px-2 py-1 text-[9px] font-black uppercase rounded-full bg-emerald-100 text-emerald-700">
                              Conectado
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-[9px] font-black uppercase rounded-full bg-slate-100 text-slate-400">
                              Pendente
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 🧩 PLUGINS E-COMMERCE */}
            <div>
              <h2 className="text-surface font-black text-[10px] uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                <Puzzle size={14} className="text-primary" />
                E-commerce Plugins
              </h2>
              <div className="grid gap-3 mt-4">
                {plugins.map((plugin) => {
                  const isConnected = selectedFilial
                    ? isGatewayConnected(selectedFilial, plugin)
                    : false;

                  return (
                    <Card
                      key={plugin.name}
                      className={cn(
                        "border-slate-200 overflow-hidden group transition-all",
                        isConnected
                          ? "border-primary/20 bg-primary/5"
                          : "hover:border-primary",
                      )}
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
                            <p className="text-xs font-black text-surface uppercase">
                              {plugin.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-slate-400">
                                v{plugin.version}
                              </span>
                              <span
                                className={cn(
                                  "px-2 py-0.5 text-[8px] font-black uppercase rounded-full",
                                  isConnected
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-400",
                                )}
                              >
                                {isConnected ? "Conectado" : "Pendente"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="h-8 w-8 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-primary hover:text-surface transition-all border border-slate-100"
                          onClick={() => openEcommerceConfig(plugin)}
                          title="Configurar integração"
                        >
                          <Settings size={14} />
                        </button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 📞 DEV SUPPORT */}
            <div className="bg-[#1a1f2e] rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl group mt-4">
              <div className="absolute top-0 right-0 h-32 w-32 bg-primary rounded-full blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity" />
              <div className="relative z-10">
                <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 group-hover:border-primary/50 transition-colors">
                  <ShieldCheck className="text-primary" size={24} />
                </div>
                <h4 className="text-sm font-black uppercase mb-3 tracking-widest text-primary">
                  Dev Support
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-8">
                  Dificuldades na instalação? Auxiliamos via WhatsApp.
                </p>
                <Button
                  className="w-full bg-white/5 hover:bg-primary hover:text-surface text-white font-black text-[10px] uppercase h-12 rounded-2xl transition-all border border-white/10 shadow-inner"
                  onClick={() => window.open("https://wa.me/suporte", "_blank")}
                >
                  Falar com Especialista
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modais */}
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
        <Dialog open={ecommerceConfigOpen} onOpenChange={setEcommerceConfigOpen}>
          <DialogContent className="max-w-xl rounded-2xl border-slate-200 bg-white text-surface">
            <DialogHeader>
              <DialogTitle className="text-surface font-black">
                {selectedPlugin?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {selectedFilial?.name || "Selecione uma filial"}
              </DialogDescription>
            </DialogHeader>

            {selectedPlugin?.id === "woocommerce" && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="woocommerceUrl">URL da loja</Label>
                  <Input
                    id="woocommerceUrl"
                    placeholder="https://minha-loja.com"
                    value={ecommerceForm.woocommerceUrl}
                    onChange={(event) =>
                      updateEcommerceForm("woocommerceUrl", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="woocommerceConsumerKey">Consumer Key</Label>
                  <Input
                    id="woocommerceConsumerKey"
                    placeholder="ck_..."
                    value={ecommerceForm.woocommerceConsumerKey}
                    onChange={(event) =>
                      updateEcommerceForm(
                        "woocommerceConsumerKey",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="woocommerceConsumerSecret">
                    Consumer Secret
                  </Label>
                  <Input
                    id="woocommerceConsumerSecret"
                    type="password"
                    placeholder="cs_..."
                    value={ecommerceForm.woocommerceConsumerSecret}
                    onChange={(event) =>
                      updateEcommerceForm(
                        "woocommerceConsumerSecret",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                  Instale o plugin PHP Payvex no WordPress e cole nele a API
                  Key e o Webhook Secret gerados nesta tela. Ao salvar, o
                  plugin registra o webhook automaticamente.
                </div>
              </div>
            )}

            {selectedPlugin?.id === "shopify" && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="shopifyUrl">Domínio da loja</Label>
                  <Input
                    id="shopifyUrl"
                    placeholder="minha-loja.myshopify.com"
                    value={ecommerceForm.shopifyUrl}
                    onChange={(event) =>
                      updateEcommerceForm("shopifyUrl", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="shopifyAccessToken">Access token</Label>
                  <Input
                    id="shopifyAccessToken"
                    type="password"
                    placeholder="shpat_..."
                    value={ecommerceForm.shopifyAccessToken}
                    onChange={(event) =>
                      updateEcommerceForm(
                        "shopifyAccessToken",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="shopifyStoreId">Store ID</Label>
                    <Input
                      id="shopifyStoreId"
                      placeholder="opcional"
                      value={ecommerceForm.shopifyStoreId}
                      onChange={(event) =>
                        updateEcommerceForm("shopifyStoreId", event.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="shopifyApiVersion">API version</Label>
                    <Input
                      id="shopifyApiVersion"
                      value={ecommerceForm.shopifyApiVersion}
                      onChange={(event) =>
                        updateEcommerceForm(
                          "shopifyApiVersion",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedPlugin?.id === "nuvem-shop" && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nuvemShopAccessToken">Access token</Label>
                  <Input
                    id="nuvemShopAccessToken"
                    type="password"
                    value={ecommerceForm.nuvemShopAccessToken}
                    onChange={(event) =>
                      updateEcommerceForm(
                        "nuvemShopAccessToken",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuvemShopStoreId">Store ID</Label>
                  <Input
                    id="nuvemShopStoreId"
                    value={ecommerceForm.nuvemShopStoreId}
                    onChange={(event) =>
                      updateEcommerceForm("nuvemShopStoreId", event.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuvemShopDomain">Domínio da loja</Label>
                  <Input
                    id="nuvemShopDomain"
                    placeholder="minha-loja.lojavirtualnuvem.com.br"
                    value={ecommerceForm.nuvemShopDomain}
                    onChange={(event) =>
                      updateEcommerceForm("nuvemShopDomain", event.target.value)
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:justify-between sm:space-x-0">
              <div>
                {selectedPlugin &&
                  selectedFilial &&
                  isGatewayConnected(selectedFilial, selectedPlugin) && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-red-100 text-red-600 hover:bg-red-50"
                      onClick={handleDisconnectEcommerce}
                      disabled={manualLoading}
                    >
                      <Unplug size={14} />
                      Desconectar
                    </Button>
                  )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {selectedPlugin?.id !== "woocommerce" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleStartOAuth}
                    disabled={!selectedFilial || oauthLoading}
                  >
                    {oauthLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    OAuth
                  </Button>
                )}
                <Button
                  type="button"
                  className="rounded-xl bg-surface text-white hover:bg-surface-hover"
                  onClick={handleManualConnect}
                  disabled={!selectedFilial || manualLoading}
                >
                  {manualLoading && <Loader2 className="animate-spin" size={14} />}
                  Salvar conexão
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
