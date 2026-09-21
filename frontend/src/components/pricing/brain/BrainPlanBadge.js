/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { cn } from "../../../lib/utils";

export default function BrainPlanBadge({ label, isHighlight, isDark }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider",
        isHighlight
          ? isDark
            ? "bg-stone-100 text-stone-800"
            : "bg-stone-700 text-stone-50"
          : isDark
            ? "bg-stone-700 text-stone-300"
            : "bg-stone-100 text-stone-600"
      )}
    >
      {label}
    </span>
  );
}
