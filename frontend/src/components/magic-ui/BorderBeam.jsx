/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { cn } from "../../lib/utils";

export default function BorderBeam({
  className,
  size = 120,
  duration = 12,
  colorFrom = "rgba(120,113,108,0.35)",
  colorTo = "rgba(168,162,158,0.15)"
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden",
        className
      )}
      aria-hidden
    >
      <div
        className="absolute animate-border-beam rounded-full opacity-70"
        style={{
          width: size,
          height: size,
          offsetPath: "rect(0 auto auto 0 round 16px)",
          background: `linear-gradient(90deg, ${colorFrom}, ${colorTo}, transparent)`,
          ["--duration"]: duration
        }}
      />
    </div>
  );
}
