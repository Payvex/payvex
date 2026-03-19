/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Building2, Loader2, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

interface CreateFilialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
}

export function CreateFilialModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
}: CreateFilialModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    cep: "",
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
  });

  // Função para buscar endereço automaticamente pelo CEP
  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
      } else {
        setFormData((prev) => ({
          ...prev,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
        }));
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP.");
    } finally {
      setSearchingCep(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.cnpj) {
      return toast.error("Nome e CNPJ são obrigatórios.");
    }

    setLoading(true);
    try {
      await api.post("/filiais", {
        ...formData,
        companyId,
      });

      toast.success("Nova unidade cadastrada com sucesso!");
      onSuccess();
      onClose();
      // Reseta o formulário
      setFormData({
        name: "",
        cnpj: "",
        cep: "",
        logradouro: "",
        bairro: "",
        cidade: "",
        uf: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao criar filial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] border-none shadow-2xl rounded-[0.625rem] bg-[#3a416f] text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white text-xl font-bold">
            <Building2 className="text-[#82d616]" /> Nova Unidade de Negócio
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Cadastre os dados jurídicos e de localização da sua nova filial.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Dados Principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                Nome da Unidade
              </Label>
              <Input
                placeholder="Ex: Filial Sul"
                className="bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                CNPJ
              </Label>
              <Input
                placeholder="00.000.000/0000-00"
                className="bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                value={formData.cnpj}
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[#82d616] font-bold text-sm">
            <MapPin size={16} /> Localização
          </div>

          {/* CEP e Logradouro */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                CEP
              </Label>
              <div className="relative">
                <Input
                  placeholder="00000-000"
                  className="bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                  value={formData.cep}
                  onBlur={handleCepBlur}
                  onChange={(e) =>
                    setFormData({ ...formData, cep: e.target.value })
                  }
                />
                {searchingCep && (
                  <Loader2 className="absolute right-2 top-3 h-4 w-4 animate-spin text-[#82d616]" />
                )}
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                Logradouro / Endereço
              </Label>
              <Input
                placeholder="Rua, Avenida..."
                className="bg-[#2a3052] border-none text-white placeholder:text-slate-500"
                value={formData.logradouro}
                onChange={(e) =>
                  setFormData({ ...formData, logradouro: e.target.value })
                }
              />
            </div>
          </div>

          {/* Bairro, Cidade, UF */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                Bairro
              </Label>
              <Input
                className="bg-[#2a3052] border-none text-white"
                value={formData.bairro}
                onChange={(e) =>
                  setFormData({ ...formData, bairro: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                Cidade
              </Label>
              <Input
                className="bg-[#2a3052] border-none text-white"
                value={formData.cidade}
                onChange={(e) =>
                  setFormData({ ...formData, cidade: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-slate-400">
                UF
              </Label>
              <Input
                maxLength={2}
                className="bg-[#2a3052] border-none text-white uppercase"
                value={formData.uf}
                onChange={(e) =>
                  setFormData({ ...formData, uf: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 border-t border-slate-600 pt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-[#82d616] hover:bg-[#71bd13] text-[#3a416f] font-black px-8"
          >
            {loading ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Finalizar Cadastro"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
