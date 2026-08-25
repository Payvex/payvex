/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PageTransition } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  Bitcoin,
  Building2,
  CircleDollarSign,
  CreditCard,
  DollarSign,
  Loader2,
  Mail,
  Phone,
  ShieldAlert,
  User as UserIcon,
  Wallet,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userRole, setUserRole] = useState<string>("USER");
  const [filiais, setFiliais] = useState<any[]>([]);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    amount: "",
    currency: "BRL",
    filialId: "",
    gateway: "STRIPE",
    paymentMethod: "CREDIT_CARD",
    cryptoCurrency: "USDT",
    customerName: "",
    customerEmail: "",
    customerDocument: "",
    customerPhone: "",
  });
  const [availableGateways, setAvailableGateways] = useState<
    { id: string; name: string }[]
  >([]);

  const gatewayFieldMap: Record<string, string[]> = {
    STRIPE: ["stripeSecretKey"],
    MERCADO_PAGO: ["mercadoPagoAccessToken"],
    PAGAR_ME: ["pagarMeAccessToken"],
    PAGBANK: ["pagarBankPrivateKey"],
    ASAAS: ["asaasApiKey"],
    STONE: ["stoneApiKey"],
    NOWPAYMENTS: ["nowPaymentsApiKey"],
    COINBASE_COMMERCE: ["coinbaseCommerceApiKey"],
    BITPAY: ["bitPayToken"],
    PICPAY: ["picPayClientSecret", "picPayPublicKey"],
    PAGSEGURO: ["pagSeguroEmail", "pagSeguroToken"],
    CIELO: ["cieloMerchantId", "cieloMerchantKey"],
  };
  const gatewayLabelMap: Record<string, string> = {
    STRIPE: "Stripe (Global)",
    MERCADO_PAGO: "Mercado Pago (LATAM)",
    PAGAR_ME: "Pagar.me (Recorrência)",
    PAGBANK: "PagBank (Banco Digital)",
    ASAAS: "Asaas (Cobranças)",
    STONE: "Stone (Adquirente)",
    NOWPAYMENTS: "NOWPayments (Cripto)",
    COINBASE_COMMERCE: "Coinbase Commerce (Cripto)",
    BITPAY: "BitPay (Cripto)",
    PICPAY: "PicPay (Carteira)",
    PAGSEGURO: "PagSeguro (Latam)",
    CIELO: "Cielo (Adquirente)",
  };
  const cryptoGatewayIds = new Set(["NOWPAYMENTS", "COINBASE_COMMERCE", "BITPAY"]);
  const cryptoCurrencyOptionsByGateway: Record<string, string[]> = {
    NOWPAYMENTS: ["USDT", "BTC", "ETH", "USDC", "LTC", "BCH", "DOGE", "DAI", "TRX", "XMR", "DASH"],
    COINBASE_COMMERCE: ["AUTO", "BTC", "ETH", "USDC", "DAI", "DOGE"],
    BITPAY: ["BTC", "BCH", "ETH", "USDC", "DOGE", "DAI", "XRP", "WBTC"],
  };
  const paymentMethodLabels: Record<string, string> = {
    CREDIT_CARD: "Cartão",
    PIX: "PIX",
    BOLETO: "Boleto",
    CRYPTO: "Cripto",
  };
  const paymentMethodsForGateway = (gateway: string) =>
    cryptoGatewayIds.has(gateway) ? ["CRYPTO"] : ["CREDIT_CARD", "PIX", "BOLETO"];
  const cryptoCurrencyOptionsForGateway = (gateway: string) =>
    cryptoCurrencyOptionsByGateway[gateway] || cryptoCurrencyOptionsByGateway.NOWPAYMENTS;
  const nextCryptoCurrencyForGateway = (gateway: string, current: string) => {
    const options = cryptoCurrencyOptionsForGateway(gateway);
    return options.includes(current) ? current : options[0];
  };
  const nextPaymentMethodForGateway = (gateway: string, current: string) => {
    const methods = paymentMethodsForGateway(gateway);
    return methods.includes(current) ? current : methods[0];
  };
  const configuredGatewaysForFilial = (filial: any) => {
    const configured: { id: string; name: string }[] = [];
    (Object.keys(gatewayFieldMap) as (keyof typeof gatewayFieldMap)[]).forEach((gw) => {
      const fields = gatewayFieldMap[gw];
      const hasCredentials = fields.some(
        (field) => filial[field] !== null && filial[field] !== undefined,
      );

      if (hasCredentials) {
        configured.push({ id: gw, name: gatewayLabelMap[gw] });
      }
    });
    return configured;
  };

  useEffect(() => {
    async function loadData() {
      try {
        const savedUser = JSON.parse(
          localStorage.getItem("@payvex:user") || "{}",
        );
        setUserRole(savedUser.role);

        // Se for ADMIN, carregamos as filiais
        if (savedUser.role === "ADMIN") {
          const res = await api.get(`/companies/${savedUser.companyId}`);
          const filiaisAtivas = (res.data.filiais || []).filter(
            (f: any) => f.isActive === true,
          );

          setFiliais(filiaisAtivas);

          if (filiaisAtivas.length > 0) {
            const selectedFilial = filiaisAtivas[0];
            setFormData((prev) => ({
              ...prev,
              filialId: selectedFilial.id,
            }));

            const configured = configuredGatewaysForFilial(selectedFilial);
            setAvailableGateways(configured);
            if (configured.length > 0) {
              const gateway = configured[0].id;
              setFormData((prev) => ({
                ...prev,
                gateway,
                paymentMethod: nextPaymentMethodForGateway(gateway, prev.paymentMethod),
                cryptoCurrency: nextCryptoCurrencyForGateway(gateway, prev.cryptoCurrency),
              }));
            }
          }
        }
      } catch (e) {
        toast.error("Erro ao carregar dados de segurança.");
      } finally {
        setCheckingAuth(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "ADMIN") return; // Dupla validação

    setLoading(true);
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      const response = await api.post("/transactions/create", payload);
      toast.success("Pagamento gerado com sucesso!");

      if (response.data.paymentUrl) {
        window.open(response.data.paymentUrl, "_blank");
      }

      router.push("/transactions");
    } catch (error: any) {
      const msg =
        error.response?.data?.message || "Erro ao processar transação.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // 1. TELA DE CARREGAMENTO INICIAL
  if (checkingAuth) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. TELA DE AVISO PARA "USER" (BLOQUEIO)
  if (userRole !== "ADMIN") {
    return (
      <PageTransition>
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6 py-20 text-center">
          <div className="h-24 w-24 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-2xl shadow-amber-500/20">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-surface">
              Acesso Restrito
            </h1>
            <p className="text-slate-500 max-w-md mx-auto">
              Sua conta de <b>Colaborador</b> possui permissões apenas para
              visualização. A criação de novas cobranças é exclusiva para
              usuários com perfil <b>Administrador</b>.
            </p>
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="rounded-xl border-slate-200 gap-2 font-bold"
            >
              <ArrowLeft size={18} /> Voltar
            </Button>
            <Button
              onClick={() => router.push("/transactions")}
              className="bg-surface text-white hover:bg-surface-hover rounded-xl font-bold"
            >
              Ver Extrato de Vendas
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  // 3. RENDERIZAÇÃO DO FORMULÁRIO (APENAS PARA ADMIN)
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <header className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-surface/60 font-semibold text-sm uppercase tracking-widest">
            <CircleDollarSign size={16} className="text-primary" />
            <span>Terminal de Vendas</span>
          </div>
          <h1 className="text-4xl font-extrabold text-surface">
            Criar Novo <span className="text-primary">Pagamento</span>
          </h1>
          <p className="text-slate-500">
            Gere cobranças utilizando as credenciais de suas filiais.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[0.625rem] border border-slate-100 shadow-sm space-y-6">
              <div className="space-y-3">
                <Label className="text-surface font-bold flex items-center gap-2">
                  <Building2 size={16} className="text-primary" /> Selecionar
                  Filial
                </Label>
                <select
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-surface outline-none focus:border-primary transition-all"
                  value={formData.filialId}
                  onChange={(e) => {
                    const filialId = e.target.value;
                    const filial = filiais.find((f) => f.id === filialId);
                    const configured = filial ? configuredGatewaysForFilial(filial) : [];
                    const gateway = configured[0]?.id || formData.gateway;
                    setAvailableGateways(configured);
                    setFormData({
                      ...formData,
                      filialId,
                      gateway,
                      paymentMethod: nextPaymentMethodForGateway(gateway, formData.paymentMethod),
                      cryptoCurrency: nextCryptoCurrencyForGateway(gateway, formData.cryptoCurrency),
                    });
                  }}
                  required
                >
                  {filiais.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - {f.cnpj}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-surface font-bold">Valor</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3.5 h-5 w-5 text-primary" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="pl-10 h-12 rounded-xl bg-slate-50"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-surface font-bold">Gateway</Label>
                  <select
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-surface outline-none"
                    value={formData.gateway}
                    onChange={(e) => {
                      const gateway = e.target.value;
                      setFormData({
                        ...formData,
                        gateway,
                        paymentMethod: nextPaymentMethodForGateway(gateway, formData.paymentMethod),
                        cryptoCurrency: nextCryptoCurrencyForGateway(gateway, formData.cryptoCurrency),
                      });
                    }}
                  >
                    {availableGateways.map((gw) => (
                      <option key={gw.id} value={gw.id}>
                        {gw.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-surface font-bold text-sm uppercase tracking-wider text-slate-400">
                  Cliente
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Nome Completo"
                      className="pl-10 h-12 rounded-xl"
                      value={formData.customerName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="E-mail"
                      className="pl-10 h-12 rounded-xl"
                      value={formData.customerEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerEmail: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="CPF/CNPJ"
                      className="pl-10 h-12 rounded-xl"
                      value={formData.customerDocument}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerDocument: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Telefone"
                      className="pl-10 h-12 rounded-xl"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerPhone: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface p-8 rounded-[0.625rem] text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-primary rounded-full blur-[60px] opacity-20"></div>
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <Zap size={18} className="text-primary" /> Método
              </h3>
              <div className="space-y-3 relative z-10">
                {paymentMethodsForGateway(formData.gateway).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, paymentMethod: method })
                    }
                    className={cn(
                      "w-full p-4 rounded-xl border flex items-center justify-between transition-all",
                      formData.paymentMethod === method
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {method === "CREDIT_CARD" ? (
                        <CreditCard size={20} />
                      ) : method === "PIX" ? (
                        <Wallet size={20} />
                      ) : method === "BOLETO" ? (
                        <Barcode size={20} />
                      ) : (
                        <Bitcoin size={20} />
                      )}
                      <span className="font-bold text-sm">
                        {paymentMethodLabels[method]}
                      </span>
                    </div>
                    {formData.paymentMethod === method && (
                      <div className="h-2 w-2 bg-primary rounded-full shadow-[0_0_10px_#8DFF00]" />
                    )}
                  </button>
                ))}
              </div>

              {formData.paymentMethod === "CRYPTO" && (
                <div className="mt-5 space-y-3 relative z-10">
                  <Label className="text-slate-300 font-bold text-[10px] uppercase tracking-widest">
                    Moeda cripto
                  </Label>
                  <select
                    className="w-full h-12 px-4 bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-primary"
                    value={formData.cryptoCurrency}
                    onChange={(e) =>
                      setFormData({ ...formData, cryptoCurrency: e.target.value })
                    }
                  >
                    {cryptoCurrencyOptionsForGateway(formData.gateway).map((currency) => (
                      <option key={currency} value={currency} className="text-surface">
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">
                    Total
                  </span>
                  <span className="text-xl font-black text-primary">
                    R$ {formData.amount || "0,00"}
                  </span>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark text-surface font-black h-14 rounded-xl shadow-[0_0_20px_rgba(141,255,0,0.3)] transition-all"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      GERAR COBRANÇA <ArrowRight size={18} />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
