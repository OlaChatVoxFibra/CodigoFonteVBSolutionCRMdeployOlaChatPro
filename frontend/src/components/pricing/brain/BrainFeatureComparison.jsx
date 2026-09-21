/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../../../lib/utils";
import { BRAIN_PRICING_FEATURES } from "../../../config/pricingCatalog";

function CellValue({ value, isDark }) {
  if (value === true) {
    return (
      <Check
        size={15}
        strokeWidth={2}
        className={cn("mx-auto", isDark ? "text-stone-400" : "text-stone-500")}
      />
    );
  }
  if (value === false || value === "—") {
    return (
      <Minus
        size={14}
        className={cn("mx-auto opacity-40", isDark ? "text-stone-600" : "text-stone-300")}
      />
    );
  }
  return (
    <span className={cn("text-[11px] font-medium", isDark ? "text-stone-300" : "text-stone-600")}>
      {value}
    </span>
  );
}

export default function BrainFeatureComparison({ isDark }) {
  const tiers = ["starter", "essencial", "pro"];
  const labels = { starter: "Starter", essencial: "Essencial", pro: "Pro" };

  return (
    <div className="mt-12 sm:mt-14">
      <h2
        className={cn(
          "mb-6 text-center text-[15px] font-medium tracking-tight sm:text-base",
          isDark ? "text-stone-200" : "text-stone-800"
        )}
      >
        Compare os planos
      </h2>

      <div
        className={cn(
          "overflow-x-auto rounded-2xl border",
          isDark ? "border-stone-700/60" : "border-stone-200/80"
        )}
      >
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className={cn("border-b", isDark ? "border-stone-700/60" : "border-stone-200/80")}>
              <th
                className={cn(
                  "px-4 py-3 text-[11px] font-medium",
                  isDark ? "text-stone-500" : "text-stone-400"
                )}
              >
                Recurso
              </th>
              {tiers.map((tier) => (
                <th
                  key={tier}
                  className={cn(
                    "px-3 py-3 text-center text-[11px] font-medium",
                    isDark ? "text-stone-300" : "text-stone-600"
                  )}
                >
                  {labels[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRAIN_PRICING_FEATURES.map((row) => (
              <tr
                key={row.name}
                className={cn(
                  "border-b last:border-0",
                  isDark ? "border-stone-800/80" : "border-stone-100",
                  row.highlight && (isDark ? "bg-stone-800/30" : "bg-stone-50/80")
                )}
              >
                <td
                  className={cn(
                    "px-4 py-2.5 text-[12px]",
                    row.highlight
                      ? isDark
                        ? "font-medium text-stone-200"
                        : "font-medium text-stone-800"
                      : isDark
                        ? "text-stone-400"
                        : "text-stone-500"
                  )}
                >
                  {row.name}
                </td>
                {tiers.map((tier) => (
                  <td key={tier} className="px-3 py-2.5 text-center">
                    <CellValue value={row.values[tier]} isDark={isDark} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
