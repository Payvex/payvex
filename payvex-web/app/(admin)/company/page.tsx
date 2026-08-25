/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DeleteFilialModal } from "@/components/DeleteFilialModal.component";
import { CreateFilialModal } from "@/components/modals/create-filial-modal";
import { CreateUserModal } from "@/components/modals/create-user-modal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Building2,
  FileText,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function CompanyPage() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("USER");

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFilial, setSelectedFilial] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [targetFilialForUser, setTargetFilialForUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchCompanyData = async () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem("@payvex:user") || "{}",
      );
      setUserRole(savedUser.role);

      const response = await api.get(`/companies/${savedUser.companyId}`);
      setCompany(response.data);
    } catch (error) {
      toast.error("Erro ao carregar ecossistema da empresa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (userRole !== "ADMIN") return;

    toast.custom(
      (t) => (
        <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-4 text-surface shadow-2xl">
          <p className="text-sm font-black">Remover acesso?</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            O usuário {userName} não poderá mais acessar esta empresa.
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
              className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black uppercase text-white hover:bg-red-700"
              onClick={() => {
                toast.dismiss(t.id);
                deleteUser(userId);
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ),
      { duration: 10000 },
    );
  };

  const deleteUser = async (userId: string) => {
    try {
      await api.delete(`/identity/collaborator/${userId}`);
      toast.success("Acesso removido.");
      fetchCompanyData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao remover usuário.");
    }
  };

  const confirmDelete = async () => {
    if (userRole !== "ADMIN") return;
    if (!selectedFilial) return;
    try {
      await api.delete(`/unidades-negocio/desativar/${selectedFilial.id}`);
      toast.success(`${selectedFilial.name} desativada.`);
      setIsDeleteModalOpen(false);
      fetchCompanyData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao desativar");
    }
  };

  const handleReactivate = async (id: string, name: string) => {
    if (userRole !== "ADMIN") return;
    try {
      await api.patch(`/unidades-negocio/reactivate/${id}`);
      toast.success(`${name} reativada!`);
      fetchCompanyData();
    } catch (error: any) {
      toast.error("Erro ao reativar unidade");
    }
  };

  if (loading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  const isAdmin = userRole === "ADMIN";
  const adminMaster = company?.users?.[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-surface tracking-tight">
            Configurações da Empresa
          </h1>
          <p className="text-slate-500 text-sm">
            {isAdmin
              ? "Gerencie suas unidades e colaboradores."
              : "Visualização de unidades e colaboradores."}
          </p>
        </div>
        {/* BLOQUEIO: Botão Nova Unidade */}
        {isAdmin && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-surface text-primary hover:bg-surface-hover font-bold rounded-xl shadow-lg gap-2"
          >
            <Plus size={18} /> Nova Unidade
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* SEÇÃO 1: FILIAIS */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="flex items-center gap-2 text-surface font-bold mb-6">
              <Building2 className="text-primary h-5 w-5" /> Unidades de
              Negócio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {company?.filiais?.map((filial: any, index: number) => (
                <div
                  key={filial.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col justify-between h-full",
                    filial.isActive
                      ? "border-slate-100 bg-slate-50/40"
                      : "bg-slate-100/50 opacity-60",
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-slate-100">
                        <Building2
                          className={
                            filial.isActive
                              ? "text-surface"
                              : "text-slate-400"
                          }
                          size={20}
                        />
                      </div>
                      <div>
                        <p className="font-black text-surface text-sm truncate max-w-[150px]">
                          {filial.name}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          {filial.cnpj}
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase",
                        filial.isActive
                          ? "bg-primary/20 text-surface"
                          : "bg-red-100 text-red-500",
                      )}
                    >
                      {filial.isActive ? "Ativa" : "Offline"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex gap-2">
                      {/* BLOQUEIO: Botão Adicionar Usuário na Filial */}
                      {isAdmin && filial.isActive && (
                        <button
                          onClick={() => {
                            setTargetFilialForUser({
                              id: filial.id,
                              name: filial.name,
                            });
                            setIsUserModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black bg-surface text-white hover:bg-primary hover:text-surface transition-all rounded-lg uppercase"
                        >
                          <UserPlus size={12} /> + Usuário
                        </button>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {/* BLOQUEIO: Botões de Lixeira e Reativar */}
                      {isAdmin &&
                        index !== 0 &&
                        (filial.isActive ? (
                          <button
                            onClick={() => {
                              setSelectedFilial(filial);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleReactivate(filial.id, filial.name)
                            }
                            className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                          >
                            <RotateCcw size={16} />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÇÃO 2: TABELA DE USUÁRIOS */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h2 className="flex items-center gap-2 text-surface font-bold">
                <Users className="text-primary h-5 w-5" /> Colaboradores e
                Acessos
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total: {company?.users?.length} usuários
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Usuário
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Perfil
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Unidade Alocada
                    </th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {company?.users?.map((user: any, index: number) => (
                    <tr
                      key={user.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-surface border border-slate-200">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-surface">
                              {user.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase",
                            user.role === "ADMIN"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-blue-50 text-blue-600",
                          )}
                        >
                          {user.role === "ADMIN" ? (
                            <ShieldAlert size={10} />
                          ) : (
                            <UserIcon size={10} />
                          )}
                          {user.role}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-xs font-medium text-slate-500">
                          {user.filialId
                            ? company.filiais.find(
                                (f: any) => f.id === user.filialId,
                              )?.name || "Unidade não encontrada"
                            : "Acesso Global (Matriz)"}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {/* BLOQUEIO: Lixeira de Usuários apenas para ADMIN e proibido no Master */}
                        {isAdmin && index !== 0 ? (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : index === 0 ? (
                          <span className="text-[8px] font-black text-primary uppercase italic mr-2">
                            Proprietário
                          </span>
                        ) : (
                          <Lock
                            size={12}
                            className="text-slate-200 ml-auto mr-2"
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="space-y-6">
          <div className="bg-surface p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-32 h-32 bg-primary rounded-full blur-[60px] opacity-10" />
            <h3 className="flex items-center gap-2 font-bold mb-6 text-primary text-[10px] uppercase tracking-[0.2em]">
              <ShieldCheck size={16} /> Proprietário Master
            </h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full border-2 border-primary flex items-center justify-center font-black text-lg bg-[#2a3052]">
                  {adminMaster?.name?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-black leading-none">
                    {adminMaster?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {adminMaster?.email}
                  </p>
                </div>
              </div>
              <Separator className="bg-white/5" />
              <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                <p className="text-[9px] uppercase text-slate-400 font-bold mb-1">
                  Empresa Vinculada
                </p>
                <p className="text-xs font-bold text-primary">
                  {company?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary p-2 rounded-lg text-surface">
                <FileText size={18} />
              </div>
              <span className="text-xs font-black text-surface uppercase tracking-wider">
                Assinatura Payvex
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Você está no plano{" "}
              <b className="text-surface">
                {company?.subscription?.planName?.toUpperCase()}
              </b>
              .
            </p>
            {/* BLOQUEIO: Botão Mudar de Plano */}
            {isAdmin && (
              <Button
                variant="outline"
                className="w-full mt-4 text-[10px] font-black uppercase h-9 border-slate-200 hover:bg-primary hover:text-surface transition-all"
              >
                Mudar de Plano
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* MODAIS (Só abrem se isAdmin for true pelas travas nos botões acima) */}
      <DeleteFilialModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        filialName={selectedFilial?.name || ""}
      />
      <CreateFilialModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyId={company?.id}
        onSuccess={fetchCompanyData}
      />
      <CreateUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        companyId={company?.id}
        filialId={targetFilialForUser?.id}
        filialName={targetFilialForUser?.name}
        onSuccess={fetchCompanyData}
      />
    </div>
  );
}
