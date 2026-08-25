import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] w-full gap-4">
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-surface" />
        <div className="absolute h-6 w-6 bg-primary rounded-full animate-pulse opacity-40" />
      </div>
      <span className="text-surface font-bold tracking-tight animate-pulse">
        Carregando Módulo Payvex...
      </span>
    </div>
  );
}
