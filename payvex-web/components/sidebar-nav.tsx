/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
"use client";

import { cn } from "@/lib/utils";
import {
  Blocks,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Lock,
  LogOut,
  User,
  UserCircle,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Extratos", icon: Wallet, href: "/transactions" },
  { label: "Pagamentos", icon: HandCoins, href: "/payments", restricted: true },
  {
    label: "Integrações",
    icon: Blocks,
    href: "/integrations",
    restricted: true,
  },
  {
    label: "Ecommerce",
    icon: Blocks,
    href: "/ecommerce",
    restricted: true,
  },
  { label: "Empresa", icon: UserCircle, href: "/company" },
  {
    label: "Assinaturas",
    icon: CreditCard,
    href: "/subscriptions",
    restricted: true,
  },
  { label: "Documentações", icon: BookOpen, href: "/docs" },
];

export function SidebarNav() {
  const Cookies = require("js-cookie");
  const pathname = usePathname();
  const router = useRouter();

  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(null);

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("@payvex:user");
    if (savedUser) {
      try {
        setUserData(JSON.parse(savedUser));
      } catch (e) {
        console.error("Erro ao carregar dados do usuário");
      }
    }
  }, []);

  const handleLogout = () => {
    Cookies.remove("@payvex:token");
    localStorage.removeItem("@payvex:token");
    localStorage.removeItem("@payvex:user");
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2) || "PX"
    );
  };

  const isAdmin = userData?.role === "ADMIN";

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 transition-all duration-500 ease-in-out z-50",
        isCollapsed
          ? "w-20 px-2 bg-transparent border-none"
          : "w-64 px-4 bg-[#3a416f] border-r border-white/10 shadow-2xl",
      )}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute top-10 bg-[#82d616] text-[#3a416f] rounded-full p-1.5 shadow-lg border-2 border-[#3a416f] hover:scale-110 transition-all z-[60]",
          isCollapsed ? "left-1/2 -translate-x-1/2" : "-right-3",
        )}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* LOGO */}
      <div
        className={cn(
          "flex items-center gap-3 mb-12 mt-4 transition-all",
          isCollapsed ? "justify-center" : "px-2",
        )}
      >
        <div className="h-10 min-w-[40px] bg-[#82d616] rounded-xl flex items-center justify-center text-[#3a416f] font-black shadow-[0_0_20px_rgba(130,214,22,0.3)]">
          P
        </div>
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-2">
            <span className="text-xl font-bold text-white tracking-tight">
              Payvex
            </span>
            <span className="text-[10px] text-[#82d616] font-bold uppercase tracking-widest">
              Hub Business
            </span>
          </div>
        )}
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-4">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          // Verifica se o item é restrito e se o usuário NÃO é admin
          const isRestrictedForUser = item.restricted && !isAdmin;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center transition-all duration-300 relative",
                isCollapsed
                  ? "justify-center"
                  : "justify-between px-3 py-3 rounded-xl",
                !isCollapsed &&
                  (isActive
                    ? "bg-white/10 text-[#82d616]"
                    : "hover:bg-white/5 text-slate-300"),
                isRestrictedForUser && "opacity-80", // Leve transparência para itens restritos
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3 w-full",
                  isCollapsed && "flex-col",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center transition-all duration-300",
                    isCollapsed &&
                      "h-12 w-12 rounded-2xl shadow-xl border border-white/5",
                    isCollapsed &&
                      (isActive
                        ? "bg-[#82d616] text-[#3a416f] scale-110 shadow-[0_0_15px_rgba(130,214,22,0.4)]"
                        : "bg-[#3a416f] text-white/50 hover:bg-[#4a528a] hover:text-white"),
                  )}
                >
                  <item.icon
                    className={cn(isCollapsed ? "h-6 w-6" : "h-5 w-5")}
                  />
                </div>

                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span
                      className={cn(
                        "whitespace-nowrap animate-in fade-in",
                        isActive
                          ? "font-bold text-[#82d616]"
                          : "group-hover:text-white",
                      )}
                    >
                      {item.label}
                    </span>

                    {/* CADEADO VISUAL PARA USER */}
                    {isRestrictedForUser && (
                      <Lock
                        size={12}
                        className="text-white/20 group-hover:text-[#82d616]/50 transition-colors"
                      />
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* PERFIL */}
      <div className="mt-auto mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center transition-all cursor-pointer group outline-none",
                isCollapsed
                  ? "justify-center h-14 w-14 mx-auto rounded-2xl bg-[#3a416f] border border-white/10 shadow-2xl hover:scale-105"
                  : "bg-white/5 p-4 border border-white/10 rounded-xl gap-3 hover:bg-white/10",
              )}
            >
              <div className="relative">
                <div
                  className={cn(
                    "rounded-full border-2 border-[#82d616] flex items-center justify-center text-xs font-bold text-white uppercase",
                    isCollapsed ? "h-9 w-9" : "h-10 w-10",
                  )}
                >
                  {userData ? getInitials(userData.name) : "PX"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[#82d616] border-2 border-[#3a416f] rounded-full" />
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0 flex-1 animate-in fade-in">
                  <span className="text-sm font-bold text-white truncate group-hover:text-[#82d616] transition-colors">
                    {userData?.name || "Usuário"}
                  </span>
                  <span className="text-[10px] text-white/50 uppercase font-medium">
                    {isAdmin ? "Sócio Admin" : "Colaborador"}
                  </span>
                </div>
              )}
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-56 bg-[#3a416f] border-white/10 text-white rounded-[0.625rem] shadow-2xl"
            align={isCollapsed ? "start" : "end"}
            side={isCollapsed ? "right" : "top"}
            sideOffset={isCollapsed ? 20 : 10}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-white">
                  {userData?.name}
                </p>
                <p className="text-xs leading-none text-white/50">
                  {userData?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              className="focus:bg-white/10 focus:text-[#82d616] cursor-pointer"
              onClick={() => router.push("/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="focus:bg-red-500/20 text-red-400 focus:text-red-400 cursor-pointer font-bold"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair da Payvex</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
