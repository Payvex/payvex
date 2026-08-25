"use client";

import { useLoader } from "@/context/loader-context";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export function AppLoader() {
  const { isLoading } = useLoader();

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-md"
        >
          {/* Container Central */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { delay: 0.1, duration: 0.5, ease: "easeOut" },
            }}
            exit={{ scale: 1.1, opacity: 0, transition: { duration: 0.3 } }}
            className="relative flex flex-col items-center"
          >
            {/* 1. Efeito de Brilho/Pulso Tecnológico */}
            <motion.div
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.4, 0, 0.4],
              }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="absolute w-24 h-24 bg-primary/40 rounded-full blur-2xl"
            />

            {/* 2. Ícone Principal Flutuante */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="relative z-10 bg-white p-5 rounded-full shadow-2xl shadow-[#82d616]/30 border border-gray-50"
            >
              <CheckCircle2 className="w-14 h-14 text-primary" />
            </motion.div>

            {/* 3. Bloco de Texto Artístico */}
            <div className="mt-10 flex flex-col items-center gap-2">
              <motion.h4
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-[#3A416F] font-bold text-2xl tracking-tight"
              >
                Payv<span className="text-primary">ex </span>
              </motion.h4>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{
                  delay: 0.7,
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="text-[#3A416F] text-[10px] font-bold uppercase tracking-[0.3em] text-center"
              >
                Segurança de nível bancário
              </motion.span>
            </div>

            {/* 4. Barra de Progresso Minimalista */}
            <motion.div
              className="mt-8 w-40 h-[3px] bg-gray-100 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Infinity,
                }}
              />
            </motion.div>

            {/* Frase de Conforto Final */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-4 text-[#3A416F] text-xs italic"
            >
              Protegendo sua liberdade financeira...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
