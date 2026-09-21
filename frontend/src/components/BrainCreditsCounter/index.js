/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import useBrainCredits from "../../hooks/useBrainCredits";

export default function BrainCreditsCounter({ onOpenPlans, refreshKey = 0 }) {
  const { balance, quota, loading, isLow, isEmpty } = useBrainCredits(refreshKey);

  if (loading) return null;

  const pct = quota > 0 ? Math.round((balance / quota) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpenPlans}
      className={`vb-brain-credits-pill${
        isEmpty || isLow ? " vb-brain-credits-pill--low" : ""
      }`}
      title={`${pct}% de créditos restantes`}
      aria-label={`Créditos: ${pct}% restantes`}
    >
      <span className="vb-brain-credits-pill__bar" aria-hidden>
        <span className="vb-brain-credits-pill__fill" style={{ width: `${pct}%` }} />
      </span>
    </button>
  );
}
