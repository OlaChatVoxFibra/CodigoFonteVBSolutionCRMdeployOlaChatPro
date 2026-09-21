/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  BRAIN_TIER_TO_STRIPE_PRODUCT,
  STRIPE_BRAIN_PAYMENT_LINKS,
  STRIPE_CRM_PAYMENT_LINKS
} from "../config/stripePaymentLinks";

/** Resolve Payment Link Stripe (CRM) por ciclo e tier. Semestral não existe no Stripe — usa mensal. */
export function resolveStripeCrmUrl(cycle, tier) {
  const c = String(cycle || "").toLowerCase();
  const t = String(tier || "").toLowerCase();
  const normalizedCycle = c === "semestral" ? "mensal" : c;
  return STRIPE_CRM_PAYMENT_LINKS[normalizedCycle]?.[t] || null;
}

/** Payment Link + e-mail pré-preenchido (Stripe: prefilled_email). */
export function buildStripeCrmCheckoutUrl(cycle, tier, email) {
  const base = resolveStripeCrmUrl(cycle, tier);
  if (!base) return null;
  if (email && String(email).trim()) {
    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}prefilled_email=${encodeURIComponent(String(email).trim())}`;
  }
  return base;
}

/** Payment Link Brain.IA por ciclo e tier (starter|essencial|pro). */
export function resolveStripeBrainUrl(cycle, tier) {
  const c = String(cycle || "").toLowerCase();
  const t = String(tier || "").toLowerCase();
  const normalizedCycle = c === "semestral" ? "mensal" : c;
  return STRIPE_BRAIN_PAYMENT_LINKS[normalizedCycle]?.[t] || null;
}

export function buildStripeBrainCheckoutUrl(cycle, tier, email) {
  const base = resolveStripeBrainUrl(cycle, tier);
  if (!base) return null;
  if (email && String(email).trim()) {
    const join = base.includes("?") ? "&" : "?";
    return `${base}${join}prefilled_email=${encodeURIComponent(String(email).trim())}`;
  }
  return base;
}

export function brainStripeProductKey(tier) {
  return BRAIN_TIER_TO_STRIPE_PRODUCT[String(tier || "").toLowerCase()] || null;
}

export function brainStripeInterval(cycle) {
  return String(cycle || "").toLowerCase() === "anual" ? "annual" : "monthly";
}
