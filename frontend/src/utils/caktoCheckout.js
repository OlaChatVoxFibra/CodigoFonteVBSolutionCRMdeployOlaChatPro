/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { buildStripeCrmCheckoutUrl } from "./stripeCheckout";

/** @deprecated Use buildStripeCrmCheckoutUrl — mantido como alias. */
export function resolveCaktoBaseUrl(cycle, tier) {
  return buildStripeCrmCheckoutUrl(cycle, tier);
}

/** Legado Cakto (não usar em novos fluxos). */
export function resolveCaktoBaseUrlLegacy(cycle, tier) {
  const map = {
    mensal: {
      starter: "https://pay.cakto.com.br/yfsvcpc",
      essencial: "https://pay.cakto.com.br/dm2p96b",
      pro: "https://pay.cakto.com.br/3ecov2x"
    },
    semestral: {
      starter: "https://pay.cakto.com.br/3wkepst",
      essencial: "https://pay.cakto.com.br/rasnk6e",
      pro: "https://pay.cakto.com.br/ecosrjo"
    },
    anual: {
      starter: "https://pay.cakto.com.br/8jcckd5",
      essencial: "https://pay.cakto.com.br/h8woa7d",
      pro: "https://pay.cakto.com.br/dm2p96b"
    }
  };
  const c = String(cycle || "").toLowerCase();
  const t = String(tier || "").toLowerCase();
  return map[c]?.[t] || null;
}

/** Checkout Stripe CRM + e-mail pré-preenchido. */
export function buildCaktoCheckoutUrl(cycle, tier, email) {
  return buildStripeCrmCheckoutUrl(cycle, tier, email);
}
