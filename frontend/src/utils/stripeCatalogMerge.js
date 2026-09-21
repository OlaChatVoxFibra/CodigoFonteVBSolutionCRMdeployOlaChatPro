/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { CRM_PRICING_PLANS, CRM_STRIPE_CHECKOUT_URLS } from "../config/pricingCatalog";

function cycleFromInterval(interval) {
  return String(interval || "").toLowerCase() === "annual" ? "anual" : "mensal";
}

function brlPriceMap(product) {
  const map = { mensal: null, anual: null };
  (product?.prices || []).forEach(row => {
    if (String(row.currency || "").toLowerCase() !== "brl") return;
    const cycle = cycleFromInterval(row.interval);
    map[cycle] = row;
  });
  return map;
}

/** Catálogo CRM local (payment links LIVE) quando a API Stripe ainda não retornou produtos. */
export function buildLocalCrmStripeCatalog() {
  return CRM_PRICING_PLANS.map(plan => ({
    key: plan.id,
    type: "crm",
    prices: [
      {
        currency: "brl",
        interval: "monthly",
        unitAmount: Math.round(plan.prices.mensal * 100),
        paymentLink: CRM_STRIPE_CHECKOUT_URLS[plan.id]?.mensal || null
      },
      {
        currency: "brl",
        interval: "annual",
        unitAmount: Math.round(plan.annualTotal * 100),
        paymentLink: CRM_STRIPE_CHECKOUT_URLS[plan.id]?.anual || null
      }
    ]
  }));
}

/**
 * Mescla cards CRM com catálogo Stripe — exibe somente planos disponíveis na Stripe.
 */
export function mergeCrmPlansWithStripeCatalog(stripeProducts) {
  if (!Array.isArray(stripeProducts) || !stripeProducts.length) return [];

  const byKey = new Map(
    stripeProducts
      .filter(p => String(p.type || "").toLowerCase() === "crm")
      .map(p => [String(p.key || "").toLowerCase(), p])
  );

  return CRM_PRICING_PLANS.filter(plan => byKey.has(String(plan.id).toLowerCase())).map(
    plan => {
      const stripe = byKey.get(String(plan.id).toLowerCase());
      const prices = brlPriceMap(stripe);
      const mensal = prices.mensal?.unitAmount != null ? prices.mensal.unitAmount / 100 : plan.prices.mensal;
      const anual =
        prices.anual?.unitAmount != null ? prices.anual.unitAmount / 100 : plan.prices.anual;
      const annualTotal =
        prices.anual?.unitAmount != null ? prices.anual.unitAmount / 100 : plan.annualTotal;

      return {
        ...plan,
        stripeKey: stripe.key,
        stripePrices: prices,
        prices: { mensal, anual },
        annualTotal
      };
    }
  );
}

export function stripeCheckoutUrl(stripeProducts, tier, cycle, email) {
  const product = (stripeProducts || []).find(
    p => String(p.key || "").toLowerCase() === String(tier || "").toLowerCase()
  );
  if (!product) return null;
  const normalizedCycle = String(cycle || "").toLowerCase() === "anual" ? "annual" : "monthly";
  const row = (product.prices || []).find(
    r =>
      String(r.interval || "").toLowerCase() === normalizedCycle &&
      String(r.currency || "").toLowerCase() === "brl"
  );
  const link = row?.paymentLink;
  if (!link) return null;
  if (email && String(email).trim()) {
    const join = link.includes("?") ? "&" : "?";
    return `${link}${join}prefilled_email=${encodeURIComponent(String(email).trim())}`;
  }
  return link;
}

const BRAIN_STRIPE_KEY_TO_TIER = {
  brain_lite: "starter",
  brain_growth: "essencial",
  brain_scale: "pro"
};

/**
 * Mescla planos Brain add-on com catálogo Stripe.
 */
export function mergeBrainPlansWithStripeCatalog(stripeProducts, brainPlans) {
  if (!Array.isArray(stripeProducts) || !stripeProducts.length) return [];
  const byKey = new Map(
    stripeProducts
      .filter(p => String(p.type || "").toLowerCase() === "brain")
      .map(p => [String(p.key || "").toLowerCase(), p])
  );

  return (brainPlans || [])
    .map(plan => {
      const stripeEntry = [...byKey.entries()].find(
        ([key]) => BRAIN_STRIPE_KEY_TO_TIER[key] === String(plan.id).toLowerCase()
      );
      if (!stripeEntry) return null;
      const [, stripe] = stripeEntry;
      const prices = brlPriceMap(stripe);
      const mensal = prices.mensal?.unitAmount != null ? prices.mensal.unitAmount / 100 : plan.prices.mensal;
      const anual =
        prices.anual?.unitAmount != null ? prices.anual.unitAmount / 100 : plan.prices.anual;
      const annualTotal =
        prices.anual?.unitAmount != null ? prices.anual.unitAmount / 100 : plan.annualTotal;

      return {
        ...plan,
        stripeKey: stripe.key,
        stripeType: "brain",
        stripePrices: prices,
        prices: { mensal, anual },
        annualTotal
      };
    })
    .filter(Boolean);
}

export function mergeAllStripeCatalog(stripeProducts, { crmPlans, brainPlans }) {
  return {
    crm: mergeCrmPlansWithStripeCatalog(stripeProducts),
    brain: mergeBrainPlansWithStripeCatalog(stripeProducts, brainPlans)
  };
}

export function formatStripeMoney(amountCents, currency = "brl") {
  if (amountCents == null) return "—";
  const value = Number(amountCents) / 100;
  if (String(currency).toLowerCase() === "brl") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  return `${String(currency).toUpperCase()} ${value.toFixed(2)}`;
}
