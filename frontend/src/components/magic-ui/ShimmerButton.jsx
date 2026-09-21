/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { cn } from "../../lib/utils";

export default function ShimmerButton({
  children,
  className,
  shimmerClassName,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full",
        "transition-transform duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full animate-shimmer",
          "bg-gradient-to-r from-transparent via-white/20 to-transparent",
          shimmerClassName
        )}
        aria-hidden
      />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
