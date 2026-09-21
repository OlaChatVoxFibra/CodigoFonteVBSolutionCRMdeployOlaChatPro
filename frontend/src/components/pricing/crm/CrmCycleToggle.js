/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  CRM_BILLING_CYCLES,
  CRM_CYCLE_LABELS,
  CRM_TOGGLE_PILL_WIDTH,
  CRM_TOGGLE_REGISTER_PILL_WIDTH,
  CRM_TOGGLE_REGISTER_WIDTH,
  CRM_TOGGLE_WIDTH
} from "./constants";
import { getCrmTogglePillOffset } from "./utils";

export default function CrmCycleToggle({ cycle, onCycleChange, toggleSize = "default" }) {
  const isRegister = toggleSize === "register";
  const toggleWidth = isRegister ? CRM_TOGGLE_REGISTER_WIDTH : CRM_TOGGLE_WIDTH;
  const pillWidth = isRegister ? CRM_TOGGLE_REGISTER_PILL_WIDTH : CRM_TOGGLE_PILL_WIDTH;
  const cycleIndex = CRM_BILLING_CYCLES.indexOf(cycle);
  const pillOffset = getCrmTogglePillOffset(
    cycle,
    CRM_BILLING_CYCLES,
    toggleWidth,
    pillWidth
  );

  const pillStyle = isRegister
    ? {
        width: "calc(50% - 3px)",
        left: 3,
        transform: `translateX(${Math.max(0, cycleIndex) * 100}%)`
      }
    : {
        width: pillWidth,
        left: 3,
        transform: `translateX(${pillOffset}px)`
      };

  return (
    <div className={`vb-pricing__toggle-wrap${isRegister ? " vb-pricing__toggle-wrap--register" : ""}`}>
      <div
        className={`vb-pricing__toggle${isRegister ? " vb-pricing__toggle--register" : ""}`}
        style={{ width: toggleWidth }}
        role="tablist"
      >
        <div
          className="vb-pricing__toggle-pill"
          style={pillStyle}
          aria-hidden
        />
        {CRM_BILLING_CYCLES.map((billingCycle) => (
          <button
            key={billingCycle}
            type="button"
            role="tab"
            aria-selected={cycle === billingCycle}
            onClick={() => onCycleChange(billingCycle)}
            className={`vb-pricing__toggle-btn${
              cycle === billingCycle ? " vb-pricing__toggle-btn--active" : ""
            }`}
          >
            {CRM_CYCLE_LABELS[billingCycle]}
          </button>
        ))}
      </div>
    </div>
  );
}
