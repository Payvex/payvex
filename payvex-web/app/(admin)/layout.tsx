import { PayvexAI } from "@/components/ai/payvex-ai";
import { SidebarNav } from "@/components/sidebar-nav";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fa]">
      {/* Sidebar persistente no lado esquerdo */}
      <SidebarNav />

      <main className="flex-1 h-screen overflow-y-auto relative bg-[#f8f9fa]">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>

      {/* A Payvex AI fica aqui, no lado oposto à Sidebar (Bottom Right).
          Ela é renderizada uma única vez e persiste entre as trocas de rotas.
      */}
      <PayvexAI />

      {/* Toaster posicionado no Top Right */}
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "0.625rem",
            border: "1px solid #e2e8f0",
            fontFamily: "inherit",
          },
          classNames: {
            success:
              "bg-white border-primary/50 text-surface [&_[data-icon]]:text-primary",
            error:
              "bg-white border-red-200 text-red-600 [&_[data-icon]]:text-red-500",
            info: "bg-surface border-surface text-white [&_[data-icon]]:text-primary",
            description: "text-slate-500 font-medium",
            actionButton: "bg-surface text-white font-bold",
            cancelButton: "bg-slate-100 text-slate-500 font-bold",
          },
        }}
      />
    </div>
  );
}
