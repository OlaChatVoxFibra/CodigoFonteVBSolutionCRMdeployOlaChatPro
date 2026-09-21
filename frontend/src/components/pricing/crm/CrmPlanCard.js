/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Code } from "lucide-react";
import { CrmFeatureText, formatAnnualPlanPrice, formatCrmPrice } from "./utils";

export default function CrmPlanCard({ plan, cycle, onSelect, compact = false }) {
  const isAnnual = cycle === "anual";
  const monthlyPrice = plan.prices.mensal;
  const displayPrice = plan.prices[cycle];
  const comparePrice = isAnnual ? monthlyPrice : null;
  const savings = comparePrice != null ? comparePrice - displayPrice : null;

  const formatted = isAnnual && plan.annualTotal
    ? formatAnnualPlanPrice(displayPrice, plan.annualTotal)
    : { ...formatCrmPrice(displayPrice), installmentLine: null, annualLine: null };

  const compareFormatted = comparePrice != null ? formatCrmPrice(comparePrice) : null;

  const cardClass = [
    "vb-pricing-card",
    `vb-pricing-card--cycle-${cycle}`,
    compact ? "vb-pricing-card--compact" : "",
    plan.highlight ? "vb-pricing-card--highlight" : "",
    plan.dark ? "vb-pricing-card--dark" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
      <div className="vb-pricing-card__head">
        <div className="vb-pricing-card__head-row">
          <h3 className="vb-pricing-card__name">{plan.name}</h3>
          {plan.badge ? <span className="vb-pricing-card__badge">{plan.badge}</span> : null}
        </div>
        {plan.description && !compact ? (
          <p className="vb-pricing-card__desc">{plan.description}</p>
        ) : null}
      </div>

      <div className="vb-pricing-card__price-block">
        {compareFormatted ? (
          <div className="vb-pricing-card__compare">
            {compareFormatted.main}
            <span>{compareFormatted.suffix}</span>
            {savings > 0 ? (
              <span className="vb-pricing-card__savings">Economize R${Math.round(savings)}</span>
            ) : null}
          </div>
        ) : null}
        {formatted.installmentLine ? (
          <>
            <div className="vb-pricing-card__installment vb-pricing-card__installment--lead">
              {formatted.installmentLine}
            </div>
            <div className="vb-pricing-card__price vb-pricing-card__price--installment">
              {formatted.main}
              <span className="vb-pricing-card__price-suffix">{formatted.suffix}</span>
            </div>
            {formatted.annualLine ? (
              <div className="vb-pricing-card__annual-total">{formatted.annualLine}</div>
            ) : null}
          </>
        ) : (
          <div className="vb-pricing-card__price">
            {formatted.main}
            <span className="vb-pricing-card__price-suffix">{formatted.suffix}</span>
          </div>
        )}
        <button type="button" onClick={() => onSelect(plan.id)} className="vb-pricing-card__cta">
          COMECE AGORA
        </button>
      </div>

      <ul className="vb-pricing-card__features">
        {plan.features.map((feature) => {
          const isBrain = /Brain\.IA/i.test(feature);
          return (
            <li
              key={feature}
              className={`vb-pricing-card__feature${isBrain ? " vb-pricing-card__feature--brain" : ""}`}
            >
              <Code className="vb-pricing-card__feature-icon" size={compact ? 12 : 14} aria-hidden />
              <span className="vb-pricing-card__feature-text">
                <CrmFeatureText text={feature} />
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
