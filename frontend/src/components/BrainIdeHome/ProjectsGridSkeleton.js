/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

function SkeletonCard() {
  return (
    <div className="brain-ide-skeleton-card overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <div className="aspect-[16/10] animate-pulse bg-zinc-800/60" />
      <div className="space-y-2 px-4 py-3">
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-zinc-800/70" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800/50" />
      </div>
    </div>
  );
}

export default function ProjectsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
