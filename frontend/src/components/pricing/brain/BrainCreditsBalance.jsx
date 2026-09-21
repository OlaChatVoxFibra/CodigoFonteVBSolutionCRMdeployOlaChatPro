/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { formatBrainCredits } from "../../../config/pricingCatalog";

export default function BrainCreditsBalance({ status, loading }) {
  if (loading && !status) {
    return <div className="vb-brain-balance vb-brain-balance--skeleton" aria-hidden />;
  }
  if (!status) return null;

  const balance = status.balance ?? 0;
  const quota = status.monthlyQuota ?? 100;
  const pct = quota > 0 ? Math.min(100, Math.round((balance / quota) * 100)) : 0;
  const renew = status.cycleEndsAt
    ? new Date(status.cycleEndsAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : null;

  return (
    <div className="vb-brain-balance vb-brain-balance--hero" role="status" aria-live="polite">
      <p className="vb-brain-balance__eyebrow">Seus créditos Brain.AI</p>
      <div className="vb-brain-balance__hero-row">
        <span className="vb-brain-balance__hero-value">{formatBrainCredits(balance)}</span>
        <span className="vb-brain-balance__hero-unit">créditos restantes</span>
      </div>
      <div className="vb-brain-balance__track" aria-hidden title={`${pct}% do plano`}>
        <div className="vb-brain-balance__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="vb-brain-balance__meta-row">
        <span className="vb-brain-balance__meta-pct">{pct}% do plano</span>
        {renew ? <span className="vb-brain-balance__meta-renew">Renova {renew}</span> : null}
      </div>
    </div>
  );
}
