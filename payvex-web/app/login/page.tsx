/* eslint-disable @typescript-eslint/no-require-imports */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoader } from "@/context/loader-context";
import { api } from "@/lib/api";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const Cookies = require("js-cookie");

  const { startLoading } = useLoader();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/identity/login", credentials);
      const { accessToken, user } = response.data;

      const userWithToken = {
        ...user,
        token: accessToken,
      };

      Cookies.set("@payvex:token", accessToken, { expires: 7 });
      localStorage.setItem("@payvex:token", accessToken);
      localStorage.setItem("@payvex:user", JSON.stringify(userWithToken));

      toast.success("Bem-vindo de volta!", {});
      startLoading();
      router.push("/dashboard");
    } catch (error) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "E-mail ou senha inválidos.";

      toast.error(msg);
      console.error("Login Error:", error);
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
            Bem-vindo de volta.
          </h2>
          <p className="text-slate-400 text-base max-w-sm">
            Acesse o Payvex e gerencie suas operações financeiras em um único
            painel.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-sm text-gray-300 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:text-white group cursor-default p-2 -ml-2 rounded-xl hover:bg-white/5">
            <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
              <CheckCircle2 className="text-primary w-5 h-5" />
            </div>
            <span className="font-medium">Intuitivo e fácil de usar.</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <h3 className="text-4xl font-bold text-[#3A416F]">Entrar</h3>
            <p className="text-gray-500">Insira suas credenciais Payvex.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold uppercase text-gray-400 tracking-wider"
                >
                  E-mail Profissional
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@payvex.com.br"
                    className="pl-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setCredentials({ ...credentials, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase text-gray-400 tracking-wider"
                >
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 text-[#3A416F]"
                    required
                    onChange={(e) =>
                      setCredentials({
                        ...credentials,
                        password: e.target.value,
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

            <Button
              className="w-full bg-primary hover:bg-[#71ba13] text-[#3A416F] font-bold h-12 text-md transition-all group rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 italic">
                  <Loader2 className="animate-spin h-4 w-4" /> Validando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Acessar Dashboard
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
                  Novo por aqui?
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-slate-200 text-[#3A416F] font-bold hover:bg-slate-50"
              onClick={() => {
                startLoading();
                router.push("/register");
              }}
            >
              Criar conta gratuita
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
