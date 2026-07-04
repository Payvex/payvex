import { AppLoader } from "@/components/layout/app-loader";
import { LoaderProvider } from "@/context/loader-context";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Payvex | Gestão Financeira Centralizada",
  description: "Organize todos os seus pagamentos em um só lugar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-slate-950 antialiased">
        {/* Provedor de Notificações Global */}
        <Suspense fallback={null}>
          <LoaderProvider>
            <AppLoader />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "#3A416F",
                  color: "#fff",
                },
                success: {
                  iconTheme: {
                    primary: "#82d616",
                    secondary: "#fff",
                  },
                },
              }}
            />

            {/* Conteúdo da Página */}
            <main>{children}</main>
          </LoaderProvider>
        </Suspense>
      </body>
    </html>
  );
}
