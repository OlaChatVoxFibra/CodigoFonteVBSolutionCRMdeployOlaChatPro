/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import { openApi } from "../../../services/api";
import {
  buildLocalCrmStripeCatalog,
  mergeCrmPlansWithStripeCatalog
} from "../../../utils/stripeCatalogMerge";
import CrmCycleToggle from "./CrmCycleToggle";
import CrmPlanCard from "./CrmPlanCard";
import CrmPricingHeader from "./CrmPricingHeader";
import CrmTrialBanner from "./CrmTrialBanner";
import useCrmPricing from "./useCrmPricing";

export default function CrmPricingSection({
  onChoose,
  title,
  subtitle,
  className = "",
  themeMode,
  compact = false,
  toggleSize = "default",
  stripeProducts = null
}) {
  const { cycle, setCycle, resolvedSubtitle, handleSelectPlan } = useCrmPricing({
    onChoose,
    subtitle
  });

  const [fetchedProducts, setFetchedProducts] = useState([]);

  useEffect(() => {
    if (Array.isArray(stripeProducts) && stripeProducts.length) return undefined;
    let cancelled = false;
    openApi
      .get("/public/stripe/plans?type=crm")
      .then(({ data }) => {
        if (!cancelled) setFetchedProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => {
        if (!cancelled) setFetchedProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [stripeProducts]);

  const catalog = Array.isArray(stripeProducts) && stripeProducts.length
    ? stripeProducts
    : fetchedProducts;

  const visiblePlans = useMemo(() => {
    const merged = mergeCrmPlansWithStripeCatalog(catalog);
    if (merged.length) return merged;
    return mergeCrmPlansWithStripeCatalog(buildLocalCrmStripeCatalog());
  }, [catalog]);

  const isRegisterEmbed = String(className || "").includes("vb-pricing--register-embed");

  const rootClass = [
    "vb-pricing",
    compact ? "vb-pricing--compact" : "",
    themeMode === "dark" ? "vb-pricing--register-dark" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClass} aria-labelledby="crm-pricing-title">
      <div className="vb-pricing__inner">
        <CrmPricingHeader title={title} subtitle={resolvedSubtitle} compact={compact} />

        {isRegisterEmbed ? <CrmTrialBanner /> : null}

        <CrmCycleToggle cycle={cycle} onCycleChange={setCycle} toggleSize={toggleSize} />

        <div className="vb-pricing__grid">
          {visiblePlans.length ? (
            visiblePlans.map((plan) => (
              <CrmPlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                onSelect={handleSelectPlan}
                compact={compact}
              />
            ))
          ) : (
            <p className="vb-pricing__empty">Nenhum plano Stripe configurado.</p>
          )}
        </div>
      </div>
    </section>
  );
}
