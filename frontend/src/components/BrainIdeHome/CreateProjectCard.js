/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Spinner } from "../ui/spinner";

export default function CreateProjectCard({ index = 0, label, loading, onClick }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={onClick}
      disabled={loading}
      className="brain-ide-create-card group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-700/80 bg-zinc-900/40 p-6 text-center transition-colors hover:border-zinc-600 hover:bg-zinc-900/70 disabled:cursor-wait disabled:opacity-70"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 ring-1 ring-white/[0.06] transition-colors group-hover:bg-zinc-700">
        {loading ? (
          <Spinner size={18} />
        ) : (
          <Plus size={20} strokeWidth={1.75} className="text-zinc-300" />
        )}
      </span>
      <span className="text-sm font-medium text-zinc-200">{label}</span>
    </motion.button>
  );
}
