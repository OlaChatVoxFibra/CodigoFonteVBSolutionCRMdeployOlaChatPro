/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Loader2 } from "lucide-react";
import { formatBrainCredits } from "../../../config/pricingCatalog";
import { formatBrainPrice } from "./utils";

function CodeMark() {
  return <span className="vb-pricing-card__code-icon" aria-hidden>{`</>`}</span>;
}

export default function BrainPlanCard({ plan, cycle, onSelect, checkingOut, isCurrentPlan = false }) {
  const price = plan.prices[cycle];
  const comparePrice = cycle !== "mensal" ? plan.prices.mensal : null;
  const isHighlight = Boolean(plan.highlight);
  const isDarkCard = plan.id === "pro";
  const isLoading = checkingOut === plan.id;
  const formatted = formatBrainPrice(price);
  const compareFormatted = comparePrice != null ? formatBrainPrice(comparePrice) : null;

  const cardClass = [
    "vb-pricing-card",
    "vb-pricing-card--landing",
    isHighlight ? "vb-pricing-card--highlight" : "",
    isDarkCard ? "vb-pricing-card--dark" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ctaClass = "vb-pricing-card__cta vb-pricing-card__cta--primary";

  return (
    <article className={cardClass}>
      {isCurrentPlan ? (
        <span className="vb-pricing-card__current-tag">Seu plano atual</span>
      ) : null}
      <div className="vb-pricing-card__head">
        <div className="vb-pricing-card__head-row">
          <h3 className="vb-pricing-card__name">{plan.name}</h3>
          {plan.badge && !isCurrentPlan ? (
            <span className="vb-pricing-card__badge">{plan.badge}</span>
          ) : (
            <span className="vb-pricing-card__badge vb-pricing-card__badge--placeholder" aria-hidden />
          )}
        </div>
        {plan.description ? (
          <p className="vb-pricing-card__desc">{plan.description}</p>
        ) : null}
      </div>

      <div className="vb-pricing-card__price-block">
        <p className="vb-pricing-card__compare">
          {compareFormatted ? (
            <>
              {compareFormatted.main}
              <span>{compareFormatted.suffix}</span>
            </>
          ) : (
            <span className="vb-pricing-card__compare-placeholder" aria-hidden>
              &nbsp;
            </span>
          )}
        </p>

        <p className="vb-pricing-card__price">
          {formatted.main}
          <span className="vb-pricing-card__price-suffix">{formatted.suffix}</span>
        </p>

        {cycle === "anual" && plan.annualTotal ? (
          <p className="vb-pricing-card__billing-note">
            R${plan.annualTotal.toLocaleString("pt-BR")} · cobrado anualmente
          </p>
        ) : (
          <p className="vb-pricing-card__billing-note">Cobrança mensal recorrente</p>
        )}

        <button
          type="button"
          className={ctaClass}
          disabled={isLoading || isCurrentPlan}
          onClick={() => onSelect(plan.id)}
        >
          {isLoading ? (
            <span className="vb-pricing-card__cta-loading">
              <Loader2 size={14} className="vb-pricing-card__spin" />
              Abrindo checkout…
            </span>
          ) : isCurrentPlan ? (
            "Plano ativo"
          ) : (
            "Assinar agora"
          )}
        </button>
      </div>

      <ul className="vb-pricing-card__features">
        <li className="vb-pricing-card__feature vb-pricing-card__feature--credits">
          <CodeMark />
          <span className="vb-pricing-card__feature-text">
            <span className="vb-pricing-card__credits-num">
              +{formatBrainCredits(plan.credits)}
            </span>{" "}
            créditos por mês
          </span>
        </li>
        {plan.features.map((feature) => (
          <li key={feature} className="vb-pricing-card__feature">
            <CodeMark />
            <span className="vb-pricing-card__feature-text">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
