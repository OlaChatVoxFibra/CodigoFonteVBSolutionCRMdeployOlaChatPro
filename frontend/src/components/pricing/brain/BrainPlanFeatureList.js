/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function BrainPlanFeatureList({ features, isDark }) {
  return (
    <ul
      className={cn(
        "mt-4 flex-1 space-y-2.5 border-t px-5 py-4 sm:px-6 sm:py-5",
        isDark ? "border-stone-700/50" : "border-stone-200/60"
      )}
    >
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5">
          <Check
            size={14}
            strokeWidth={2}
            className={cn("mt-0.5 shrink-0", isDark ? "text-stone-500" : "text-stone-400")}
            aria-hidden
          />
          <span
            className={cn(
              "text-[12px] leading-snug",
              isDark ? "text-stone-300" : "text-stone-600"
            )}
          >
            {feature}
          </span>
        </li>
      ))}
    </ul>
  );
}
