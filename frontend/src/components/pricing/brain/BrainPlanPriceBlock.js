/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../../lib/utils";
import ShimmerButton from "../../magic-ui/ShimmerButton";
import { formatBrainPrice } from "./utils";

export default function BrainPlanPriceBlock({
  price,
  comparePrice,
  cycle,
  annualTotal,
  isHighlight,
  isDark,
  loading,
  onSelect
}) {
  const formatted = formatBrainPrice(price);
  const compareFormatted = comparePrice != null ? formatBrainPrice(comparePrice) : null;
  const savings =
    comparePrice && price < comparePrice
      ? Math.round(((comparePrice - price) / comparePrice) * 100)
      : null;

  return (
    <>
      {compareFormatted ? (
        <p className={cn("mb-0.5 text-xs line-through", isDark ? "text-stone-600" : "text-stone-400")}>
          {compareFormatted.main}
          <span className="no-underline">{compareFormatted.suffix}</span>
        </p>
      ) : null}

      <div className="mb-1 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className={cn(
            "text-2xl font-medium tabular-nums tracking-tight sm:text-[1.65rem]",
            isDark ? "text-stone-50" : "text-stone-900"
          )}
        >
          {formatted.main}
        </span>
        <span className={cn("text-xs font-normal", isDark ? "text-stone-500" : "text-stone-400")}>
          {formatted.suffix}
        </span>
        {savings ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              isDark ? "bg-stone-800 text-stone-300" : "bg-stone-100 text-stone-600"
            )}
          >
            −{savings}% no anual
          </span>
        ) : null}
      </div>

      {cycle === "anual" && annualTotal ? (
        <p className={cn("mb-4 text-[11px]", isDark ? "text-stone-500" : "text-stone-400")}>
          R${annualTotal.toLocaleString("pt-BR")} cobrados anualmente
        </p>
      ) : (
        <div className="mb-4" />
      )}

      <ShimmerButton
        onClick={onSelect}
        disabled={loading}
        className={cn(
          "h-10 w-full text-[13px] font-medium",
          isHighlight
            ? isDark
              ? "bg-stone-100 text-stone-900 hover:bg-white"
              : "bg-stone-900 text-white hover:bg-stone-800"
            : isDark
              ? "border border-stone-700 bg-stone-800/80 text-stone-100 hover:bg-stone-800"
              : "border border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
        )}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Abrindo checkout…
          </span>
        ) : (
          "Assinar agora"
        )}
      </ShimmerButton>
    </>
  );
}
