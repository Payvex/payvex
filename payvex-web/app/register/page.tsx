/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { api } from "@/lib/api";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    userName: "",
    userEmail: "",
    userPassword: "",
    companyName: "",
    postalCode: "",
    address: "",
    neighborhood: "",
    state: "",
    city: "",
    phone: "",
    companyCnpj: "",
  });

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .substring(0, 18);
  };

  const handleFetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`,
      );
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        address: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      }));

      toast.success("Endereço localizado!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      toast.error("Erro ao conectar com serviço de CEP.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      userName: formData.userName,
      userEmail: formData.userEmail,
      userPassword: formData.userPassword,
      companyName: formData.companyName,
      postalCode: formData.postalCode,
      address: formData.address,
      neighborhood: formData.neighborhood,
      state: formData.state,
      city: formData.city,
      phone: formData.phone,
      filiais: [
        {
          name: "Matriz",
          cnpj: formData.companyCnpj.replace(/\D/g, ""),
        },
      ],
    };

    try {
      await api.post("/identity/signup", payload);
      toast.success("Conta criada com sucesso!");
      router.push("/login");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Erro ao criar conta.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:flex w-1/2 bg-[#0B1020] p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10 space-y-6">
          <Image
            src="/Payvex_logo_brand_white.png"
            alt="Payvex Logo"
            width={260}
            height={160}
            priority
            className="object-contain"
          />

          <h2 className="text-4xl font-extrabold leading-tight text-white">
            Assuma o controle.
          </h2>
          <p className="text-slate-400 text-base max-w-sm">
            Centralize Stripe, Mercado Pago e outros gateways em um único
            dashboard inteligente.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-300 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:text-white group cursor-default p-2 -ml-2 rounded-xl hover:bg-white/5">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <CheckCircle2 className="text-primary w-5 h-5" />
            </div>
            <span className="font-medium">Setup rápido e intuitivo.</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h3 className="text-4xl font-bold text-[#3A416F]">Comece agora</h3>
            <p className="text-gray-500">
              Crie sua conta administrativa no Payvex.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="userName"
                  className="text-xs font-bold uppercase text-gray-400 tracking-wider"
                >
                  Acesso Master
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="userName"
                    type="text"
                    placeholder="Nome Completo"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, userName: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="E-mail Corporativo"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, userEmail: e.target.value })
                    }
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="userPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Senha de Acesso"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        userPassword: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-[#3A416F]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100 w-full my-4"></div>

            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                Dados da Empresa
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome da Empresa"
                  className="pl-10 h-11 text-[#3A416F]"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="CNPJ Matriz"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    value={formData.companyCnpj}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        companyCnpj: maskCNPJ(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Telefone"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Input
                    placeholder="CEP"
                    className="h-11 text-[#3A416F]"
                    required
                    maxLength={9}
                    value={formData.postalCode}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .replace(/^(\d{5})(\d)/, "$1-$2");
                      setFormData({ ...formData, postalCode: value });
                    }}
                    onBlur={(e) => handleFetchAddress(e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder="Logradouro"
                    className="h-11 text-[#3A416F]"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Bairro"
                  className="h-11 text-[#3A416F]"
                  required
                  value={formData.neighborhood}
                  onChange={(e) =>
                    setFormData({ ...formData, neighborhood: e.target.value })
                  }
                />
                <Input
                  placeholder="Cidade"
                  className="h-11 text-[#3A416F]"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                />
                <Input
                  placeholder="UF"
                  className="h-11 text-[#3A416F]"
                  maxLength={2}
                  required
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                />
              </div>
            </div>

            <Button
              className="w-full bg-primary hover:bg-[#71ba13] text-[#3A416F] font-bold h-12 text-md transition-all group rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 italic">
                  Processando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Finalizar Cadastro
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">
                  Já tem conta?
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-200 text-[#3A416F] font-bold hover:bg-slate-50"
              onClick={() => {
                router.push("/login");
              }}
            >
              Fazer login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
