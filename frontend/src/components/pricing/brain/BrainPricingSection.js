/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { BRAIN_PRICING_PLANS } from "../../../config/pricingCatalog";
import BrainCycleToggle from "./BrainCycleToggle";
import BrainPlanCard from "./BrainPlanCard";
import BrainPricingFooter from "./BrainPricingFooter";
import BrainPricingHeader from "./BrainPricingHeader";
import useBrainPricing from "./useBrainPricing";

export default function BrainPricingSection({
  themeMode = "light",
  onChoose,
  subtitle,
  creditsStatus,
  creditsLoading,
  className = ""
}) {
  const isDark = themeMode === "dark";
  const { cycle, setCycle, resolvedSubtitle, handleSelectPlan, checkingOut } =
    useBrainPricing({ onChoose, subtitle });

  const normalizePlanId = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const currentAddonPlan = normalizePlanId(creditsStatus?.brainAddonPlan);

  const modeClass = isDark ? "vb-pricing--brain-dark" : "vb-pricing--brain-light";

  return (
    <section
      className={`vb-pricing vb-pricing--brain ${modeClass} ${className}`.trim()}
      aria-labelledby="brain-pricing-title"
    >
      <div className="vb-pricing__inner">
        <BrainPricingHeader isDark={isDark} subtitle={resolvedSubtitle} />

        <BrainCycleToggle cycle={cycle} onCycleChange={setCycle} isDark={isDark} />

        <div className="vb-pricing__grid vb-pricing__grid--landing">
          {BRAIN_PRICING_PLANS.map((plan) => (
            <BrainPlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              isDark={isDark}
              onSelect={handleSelectPlan}
              checkingOut={checkingOut}
              isCurrentPlan={
                Boolean(currentAddonPlan) &&
                normalizePlanId(plan.id) === currentAddonPlan
              }
            />
          ))}
        </div>

        <BrainPricingFooter isDark={isDark} />
      </div>
    </section>
  );
}
