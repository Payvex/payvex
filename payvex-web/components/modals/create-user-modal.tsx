/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { Loader2, Lock, Mail, Shield, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  filialId?: string;
  filialName?: string;
  onSuccess: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  filialId,
  filialName,
  onSuccess,
}: CreateUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER", // Padrão para novos colaboradores
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/identity/create", {
        ...formData,
        filialId: filialId, // Vincula o usuário à unidade selecionada
      });

      toast.success("Colaborador adicionado com sucesso!");
      onSuccess();
      onClose();
      setFormData({ name: "", email: "", password: "", role: "USER" });
    } catch (error: any) {
      const message = error.response?.data?.message || "Erro ao criar usuário.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-[1rem] bg-surface border-none shadow-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#FFFFFF] font-bold text-xl">
            <UserPlus className="text-primary" /> Novo Colaborador
          </DialogTitle>
          <p className="text-xs text-slate-400 font-medium">
            Vinculando acesso à unidade:{" "}
            <span className="text-surface font-bold">
              {filialName || "Geral"}
            </span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label className=" text-slate-500 font-bold text-[11px] uppercase">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
              <Input
                className="pl-10 bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                placeholder="Ex: João Silva"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-500 font-bold text-[11px] uppercase">
              E-mail de Acesso
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
              <Input
                type="email"
                className="pl-10 bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                placeholder="joao@empresa.com"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-500 font-bold text-[11px] uppercase">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-300" />
                <Input
                  type="password"
                  className="pl-10 bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                  placeholder="******"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-500 font-bold text-[11px] uppercase">
                Perfil (Role)
              </Label>
              <select
                className="w-full h-10 px-3 bg-[#2a3052] border border-slate-100 rounded-md text-sm font-bold text-slate-500 outline-none"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="USER">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-3">
            <Shield className="text-blue-500 h-5 w-5 mt-0.5" />
            <p className="text-[10px] text-blue-700 leading-tight">
              Usuários <b>Operadores</b> podem apenas visualizar dados da filial
              vinculada.
              <b> Administradores</b> podem criar cobranças.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1 font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-surface hover:bg-surface-hover text-primary font-black"
            >
              {loading ? <Loader2 className="animate-spin" /> : "CRIAR USUÁRIO"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
