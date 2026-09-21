/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

export function MonthlyPriceCell({ prices, classes }) {
  const row = (prices || []).find((p) => p.currency === "brl" && p.interval === "monthly");
  return (
    <div>
      <div className={classes.priceText}>{row?.formattedAmount || "—"}</div>
      {row?.priceId ? (
        <div className={classes.priceMuted}>mensal</div>
      ) : null}
    </div>
  );
}

export function AnnualPriceCell({ prices, classes }) {
  const row = (prices || []).find((p) => p.currency === "brl" && p.interval === "annual");
  return (
    <div>
      <div className={classes.priceText}>{row?.formattedAmount || "—"}</div>
      {row?.priceId ? (
        <div className={classes.priceMuted}>anual</div>
      ) : null}
    </div>
  );
}

export function BillingCell({ stripe, planAmount, recurrence, classes, formatStripeMoney }) {
  if (stripe?.amountCents != null) {
    const label = stripe.interval === "annual" ? "Anual" : "Mensal";
    return (
      <div>
        <div className={classes.priceText}>
          {formatStripeMoney(stripe.amountCents, stripe.currency || "brl")}
        </div>
        <div className={classes.priceMuted}>{label}</div>
      </div>
    );
  }
  const rec = String(recurrence || "").toUpperCase();
  const isAnnual = rec === "ANUAL" || rec === "ANUAL ";
  return (
    <div>
      <div className={classes.priceText}>
        {planAmount != null
          ? `R$ ${Number(planAmount).toLocaleString("pt-br", { minimumFractionDigits: 2 })}`
          : "—"}
      </div>
      <div className={classes.priceMuted}>{isAnnual ? "Anual" : "Mensal"}</div>
    </div>
  );
}

export function planOptionLabel(plan, formatStripeMoney) {
  const { monthly, annual } = {
    monthly: plan.prices?.find((p) => p.currency === "brl" && p.interval === "monthly"),
    annual: plan.prices?.find((p) => p.currency === "brl" && p.interval === "annual")
  };
  const parts = [plan.label || plan.name || plan.key];
  if (monthly?.unitAmount != null) {
    parts.push(`${formatStripeMoney(monthly.unitAmount, "brl")}/mês`);
  }
  if (annual?.unitAmount != null) {
    parts.push(`${formatStripeMoney(annual.unitAmount, "brl")}/ano`);
  }
  return parts.join(" · ");
}
