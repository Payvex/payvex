/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as z from "zod";

/**
 * 📋 MAPA CANÔNICO DE CREDENCIAIS POR GATEWAY
 *
 * Fonte de verdade: prisma/schema.prisma → modelo Filial.
 * Cada entrada é a lista de colunas reais que o backend persiste para
 * aquele gateway. O modal renderiza dinamicamente esses campos e o
 * service/DTO só aceita estes nomes — evitando o erro de "chaves padrão
 * stripe em todos os modais".
 *
 * - `type: "secret"`  → input password
 * - `type: "text"`    → input texto
 * - `type: "bool"`    → switch (sandbox / ambiente de teste)
 */
interface GatewayField {
  name: string; // nome da coluna no schema
  label: string; // rótulo amigável no modal
  type: "secret" | "text" | "bool";
  placeholder?: string;
  required?: boolean;
}

const GATEWAY_FIELDS: Record<string, GatewayField[]> = {
  stripe: [
    { name: "stripePublicKey",     label: "Public Key (pk)",            type: "secret", placeholder: "pk_live_..." },
    { name: "stripeSecretKey",     label: "Secret Key (sk)",            type: "secret", placeholder: "sk_live_..." },
    { name: "stripeWebhookSecret", label: "Webhook Signing Secret",     type: "secret", placeholder: "whsec_...", required: false },
  ],
  mercadopago: [
    { name: "mercadoPagoAccessToken", label: "Access Token", type: "secret", placeholder: "APP_USR-..." },
    { name: "mercadoPagoWebhookSecret", label: "Webhook Secret", type: "secret", placeholder: "Chave secreta da tela de Webhooks", required: false },
  ],
  pagarme: [
    { name: "pagarMeAccessToken", label: "Secret Key (sk_test/sk)", type: "secret", placeholder: "sk_test_..." },
    { name: "pagarMePublicKey", label: "Public Key (pk_test/pk)", type: "secret", placeholder: "pk_test_...", required: false },
  ],
  pagbank: [
    { name: "pagarBankPrivateKey", label: "Token de autenticação (Bearer)", type: "secret", placeholder: "token..." },
    { name: "pagarBankSandbox", label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
  asaas: [
    { name: "asaasApiKey", label: "API Key (access_token)", type: "secret", placeholder: "access_token..." },
    { name: "asaasWebhookToken", label: "Token de autenticação do Webhook", type: "secret", placeholder: "token enviado no header asaas-access-token", required: false },
    { name: "asaasSandbox", label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
  cielo: [
    { name: "cieloMerchantId",  label: "Merchant ID",  type: "text",  placeholder: "ID do lojista" },
    { name: "cieloMerchantKey", label: "Merchant Key", type: "secret", placeholder: "Chave do lojista" },
    { name: "cieloWebhookHeaderKey", label: "Header do webhook", type: "text", placeholder: "ex: x-payvex-token", required: false },
    { name: "cieloWebhookHeaderValue", label: "Valor do header do webhook", type: "secret", placeholder: "valor configurado na Cielo", required: false },
    { name: "cieloSandbox",     label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
  stone: [
    { name: "stoneApiKey",   label: "Secret Key Stone Online (sk)", type: "secret", placeholder: "sk_..." },
    { name: "stoneClientId", label: "Client ID IDP (subadquirente)", type: "text",  placeholder: "opcional", required: false },
    { name: "stoneSecret",   label: "Client Secret IDP (subadquirente)", type: "secret", placeholder: "opcional", required: false },
    { name: "stoneSandbox",  label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
  nowpayments: [
    { name: "nowPaymentsApiKey", label: "API Key", type: "secret", placeholder: "x-api-key..." },
    { name: "nowPaymentsIpnSecret", label: "IPN Secret", type: "secret", placeholder: "Secret key do IPN", required: false },
  ],
  coinbasecommerce: [
    { name: "coinbaseCommerceApiKey", label: "API Key", type: "secret", placeholder: "Coinbase Commerce API Key" },
    { name: "coinbaseCommerceWebhookSecret", label: "Webhook Shared Secret", type: "secret", placeholder: "Shared secret do webhook", required: false },
  ],
  bitpay: [
    { name: "bitPayToken", label: "POS Token", type: "secret", placeholder: "Token POS do BitPay" },
    { name: "bitPaySandbox", label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
  picpay: [
    { name: "picPayClientId", label: "Client ID", type: "text", placeholder: "client_id..." },
    { name: "picPayClientSecret", label: "Client Secret", type: "secret", placeholder: "client_secret..." },
    { name: "picPaySellerToken", label: "x-seller-token do callback", type: "secret", placeholder: "token do webhook/callback", required: false },
    { name: "picPayPublicKey", label: "x-picpay-token legado", type: "secret", placeholder: "compatibilidade", required: false },
  ],
  pagseguro: [
    { name: "pagSeguroEmail", label: "E-mail da conta", type: "text",  placeholder: "loja@exemplo.com" },
    { name: "pagSeguroToken", label: "Token da conta", type: "secret", placeholder: "token..." },
    { name: "pagSeguroSalt",  label: "Salt opcional", type: "text",  placeholder: "opcional",  required: false },
    { name: "pagSeguroSandbox", label: "Ambiente de teste (sandbox)", type: "bool" },
  ],
};

const MASKED_SECRET = "••••••••••••••••••••";

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  integration: any;
  filialId: string | undefined;
  onSuccess: () => void;
}

export function IntegrationModal({
  isOpen,
  onClose,
  integration,
  filialId,
  onSuccess,
}: IntegrationModalProps) {
  const [loading, setLoading] = useState(false);
  const isConnected = !!integration?.isConnected;

  const gatewayId: string = integration?.id ?? "stripe";
  const fields = useMemo(() => GATEWAY_FIELDS[gatewayId] ?? [], [gatewayId]);

  /* Zod schema dinâmico — só os campos que o gateway realmente exige */
  const formSchema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const f of fields) {
      if (f.type === "bool") {
        shape[f.name] = z.boolean().default(false);
      } else {
        shape[f.name] = f.required === false
          ? z.string().optional()
          : z.string().min(1, `O campo ${f.label} é obrigatório`);
      }
    }
    return z.object(shape);
  }, [fields]);

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {} as FormValues,
  });

  /* Reset imediato ao abrir */
  useEffect(() => {
    if (isOpen && fields.length) {
      const defaults: Record<string, any> = {};
      fields.forEach((f) => {
        if (f.type === "bool") {
          defaults[f.name] = integration?.filial?.[f.name] ?? false;
        } else {
          defaults[f.name] = isConnected ? MASKED_SECRET : "";
        }
      });
      form.reset(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isConnected, fields]);

  /** Monta { [fieldName]: value|null } para o payload do backend */
  const buildPayload = (values: FormValues) => {
    const payload: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.type === "bool") {
        payload[f.name] = values[f.name] ?? false;
      } else {
        const value = values[f.name];
        if (value === MASKED_SECRET) return;
        payload[f.name] = value || null;
      }
    });
    return payload;
  };

  async function onSubmit(values: FormValues) {
    if (!filialId) return toast.error("Selecione uma filial primeiro.");
    if (!fields.length) {
      return toast.error("Nenhum campo mapeado para este gateway.");
    }
    setLoading(true);
    try {
      const payload = buildPayload(values);
      if (Object.keys(payload).length === 0) {
        toast.success("Nenhuma credencial alterada.");
        onClose();
        return;
      }

      await api.patch(`/filiais/${filialId}/gateways`, payload);
      toast.success(`${integration.name} atualizado com sucesso!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Erro ao salvar credenciais.",
      );
    } finally {
      setLoading(false);
    }
  }

  const handleDisconnect = async () => {
    if (!filialId) return;
    setLoading(true);
    try {
      const payload = buildPayload(
        fields.reduce(
          (acc, f) => ({ ...acc, [f.name]: null }),
          {} as FormValues,
        ),
      );
      await api.patch(`/filiais/${filialId}/gateways`, payload);
      toast.success(`${integration.name} desconectado.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Erro ao remover credenciais.");
    } finally {
      setLoading(false);
    }
  };

  if (!integration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#3a416f] text-white border-none shadow-2xl rounded-[0.625rem] outline-none z-[9999]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white rounded-lg p-2 shrink-0 shadow-inner">
              <img
                src={integration.logo}
                alt={integration.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <DialogTitle className="text-white font-bold text-xl">
                {isConnected ? "Gerenciar" : "Configurar"} {integration.name}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-xs">
                Unidade:{" "}
                <span className="text-[#82d616] font-bold uppercase">
                  {integration.filialName}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            {fields.map((f) => {
              if (f.type === "bool") {
                return (
                  <FormField
                    key={f.name}
                    control={form.control}
                    name={f.name as keyof FormValues}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-[0.625rem] bg-[#2a3052] p-3 border border-white/10">
                        <FormLabel className="text-slate-200 font-medium">
                          {f.label}
                        </FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-[#82d616]"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                );
              }

              return (
                <FormField
                  key={f.name}
                  control={form.control}
                  name={f.name as keyof FormValues}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200">{f.label}</FormLabel>
                      <FormControl>
                        <Input
                          type={f.type === "secret" ? "password" : "text"}
                          autoComplete="off"
                          placeholder={f.placeholder}
                          className="rounded-[0.625rem] bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#82d616] autofill:shadow-[inset_0_0_0_1000px_#3a416f] transition-all"
                          value={(field.value as string | undefined) ?? ""}
                          onChange={field.onChange}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage className="text-red-300" />
                    </FormItem>
                  )}
                />
              );
            })}

            <div className="bg-[#2a3052] p-3 rounded-[0.625rem] flex items-start gap-2 border border-white/10 mt-2">
              <ShieldCheck className="h-5 w-5 text-[#82d616] mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-300 leading-tight italic">
                Criptografia AES-256 ativa. BYOK configurado para esta unidade.
              </p>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 items-center">
              {isConnected && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="text-red-400 hover:bg-red-500/10 font-bold w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Desconectar
                </Button>
              )}
              <div className="flex-1" />
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#82d616] hover:bg-[#71bd13] text-[#3a416f] font-bold h-12 rounded-[0.625rem]"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <Save className="mr-2" size={18} />
                    {isConnected ? "Salvar Alterações" : "Ativar Gateway"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
