/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { motion } from "framer-motion";

export default function ProjectCard({ item, index = 0, editedLabel, onOpen }) {
  const handleClick = () => onOpen?.(item);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      onClick={handleClick}
      className="brain-ide-project-card group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/80"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-950">
        {item.previewHtml ? (
          <iframe
            title={item.title}
            srcDoc={item.previewHtml}
            sandbox=""
            className="pointer-events-none absolute left-0 top-0 h-[200%] w-[200%] origin-top-left scale-50 border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            Sem preview
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="flex flex-col gap-1 px-4 py-3">
        <span className="truncate text-sm font-medium text-zinc-100">{item.title}</span>
        {item.projectTitle ? (
          <span className="truncate text-xs text-zinc-500">{item.projectTitle}</span>
        ) : null}
        <span className="text-[11px] text-zinc-500">{editedLabel}</span>
      </div>
    </motion.button>
  );
}
