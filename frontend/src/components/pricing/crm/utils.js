/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

export function formatCrmPrice(value) {
  const n = Number(value);
  const main = `R$${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")}`;
  return { main, suffix: "/mês" };
}

/** Plano anual: parcela mensal (total ÷ 12) em destaque. */
export function formatAnnualPlanPrice(monthlyInstallment, annualTotal) {
  const installment = formatCrmPrice(monthlyInstallment);
  const totalFormatted = `R$${Number(annualTotal).toLocaleString("pt-BR")}`;
  return {
    main: installment.main,
    suffix: installment.suffix,
    installmentLine: `12x de ${installment.main}`,
    annualLine: `${totalFormatted}/ano`
  };
}

export function formatOnboardingInstallment(price, installments = 12) {
  const perInstallment = price / installments;
  const formatted = formatCrmPrice(perInstallment);
  return `Parcelável em até ${installments}x de ${formatted.main}`;
}

export function getCrmTogglePillOffset(cycle, cycles, toggleWidth, pillWidth) {
  const cycleIndex = cycles.indexOf(cycle);
  const slotWidth = toggleWidth / cycles.length;
  return cycleIndex * slotWidth + (slotWidth - pillWidth) / 2;
}

const EMPHASIS_REGEX =
  /(\b(?:ilimitad[oa]s?|usuários?|membros?|conexões?|leads?)\b|\d+\s?mil|\d+(?:\.\d+)?)/gi;

export function CrmFeatureText({ text }) {
  const parts = text.split(EMPHASIS_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        const testRegex = new RegExp(EMPHASIS_REGEX.source, EMPHASIS_REGEX.flags);
        return testRegex.test(part) ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>;
      })}
    </>
  );
}
