/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { BRAIN_BILLING_CYCLES, BRAIN_CYCLE_LABELS } from "./constants";

export default function BrainCycleToggle({ cycle, onCycleChange }) {
  const toggleClass = [
    "vb-pricing__toggle",
    "vb-pricing__toggle--brain-segmented",
    cycle === "mensal" ? "vb-pricing__toggle--mensal" : "vb-pricing__toggle--anual",
  ].join(" ");

  return (
    <div className="vb-pricing__toggle-wrap">
      <div className={toggleClass} role="tablist" aria-label="Ciclo de cobrança">
        <div className="vb-pricing__toggle-pill" aria-hidden />
        {BRAIN_BILLING_CYCLES.map((billingCycle) => (
          <button
            key={billingCycle}
            type="button"
            role="tab"
            aria-selected={cycle === billingCycle}
            className={`vb-pricing__toggle-btn${
              cycle === billingCycle ? " vb-pricing__toggle-btn--active" : ""
            }`}
            onClick={() => onCycleChange(billingCycle)}
          >
            {BRAIN_CYCLE_LABELS[billingCycle]}
          </button>
        ))}
      </div>
    </div>
  );
}
