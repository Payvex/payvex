"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Lock, Building, FileText, Phone, MapPin } from "lucide-react";

const registerSchema = z.object({
  fullName: z.string().min(1, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  companyName: z.string().min(1, "Nome da empresa obrigatório"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  phone: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    console.log(data);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900">Comece agora</h2>
        <p className="text-sm text-slate-500 mt-1">Crie sua conta administrativa no Payvex.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ACESSO MASTER */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Acesso Master</h3>

          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-bold text-slate-500 uppercase">
              NOME COMPLETO
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="fullName"
                placeholder="Nome completo"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("fullName")}
              />
            </div>
            {errors.fullName && (
              <span className="text-xs text-red-500">{errors.fullName.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">
              E-MAIL CORPORATIVO
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                placeholder="exemplo@payvex.com.br"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("email")}
              />
            </div>
            {errors.email && (
              <span className="text-xs text-red-500">{errors.email.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase">
              SENHA DE ACESSO
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                className="pl-10 pr-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <span className="text-xs text-red-500">{errors.password.message}</span>
            )}
          </div>
        </div>

        {/* DADOS DA EMPRESA */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Dados da Empresa</h3>

          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-xs font-bold text-slate-500 uppercase">
              NOME DA EMPRESA
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="companyName"
                placeholder="Nome da empresa"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("companyName")}
              />
            </div>
            {errors.companyName && (
              <span className="text-xs text-red-500">{errors.companyName.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj" className="text-xs font-bold text-slate-500 uppercase">
              CNPJ MATRIZ
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="cnpj"
                placeholder="00.000.000/0001-00"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("cnpj")}
              />
            </div>
            {errors.cnpj && (
              <span className="text-xs text-red-500">{errors.cnpj.message}</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase">
              TELEFONE
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("phone")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep" className="text-xs font-bold text-slate-500 uppercase">
                CEP
              </Label>
              <Input
                id="cep"
                placeholder="00000-000"
                className="h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("cep")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf" className="text-xs font-bold text-slate-500 uppercase">
                UF
              </Label>
              <Input
                id="uf"
                placeholder="SP"
                className="h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("uf")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logradouro" className="text-xs font-bold text-slate-500 uppercase">
              LOGADOURO
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="logradouro"
                placeholder="Rua, Av, etc"
                className="pl-10 h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("logradouro")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bairro" className="text-xs font-bold text-slate-500 uppercase">
                BAIRRO
              </Label>
              <Input
                id="bairro"
                placeholder="Bairro"
                className="h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("bairro")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-xs font-bold text-slate-500 uppercase">
                CIDADE
              </Label>
              <Input
                id="cidade"
                placeholder="Cidade"
                className="h-12 border-slate-200 focus:border-green-500 focus:ring-green-500"
                {...register("cidade")}
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-black text-sm uppercase tracking-wider"
        >
          {isLoading ? "Cadastrando..." : "Finalizar Cadastro →"}
        </Button>

        <div className="text-center text-xs text-slate-400 pt-4">
          <span>Já tem conta? </span>
          <a href="/login" className="text-green-600 font-bold hover:underline">Fazer login</a>
        </div>
      </form>
    </div>
  );
}
