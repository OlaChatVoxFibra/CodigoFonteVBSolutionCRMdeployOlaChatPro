/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Limites e recursos — espelho do backend stripePlanEntitlements.ts */

export const STRIPE_PLAN_ENTITLEMENTS = {
  starter: {
    maxUsers: 3,
    maxConnections: 3,
    maxLeads: 10000,
    brainCreditsIncluded: 300,
    highlights: ["3 usuários", "3 conexões", "300 créditos Brain/mês"]
  },
  essencial: {
    maxUsers: 15,
    maxConnections: 10,
    maxLeads: 100000,
    brainCreditsIncluded: 1000,
    highlights: ["15 usuários", "10 conexões", "1.000 créditos Brain/mês"]
  },
  pro: {
    maxUsers: null,
    maxConnections: null,
    maxLeads: null,
    brainCreditsIncluded: 3000,
    highlights: ["Ilimitado", "Ilimitado", "3.000 créditos Brain/mês"]
  },
  brain_lite: { brainAddonCredits: 100, highlights: ["+100 créditos/mês"] },
  brain_growth: { brainAddonCredits: 350, highlights: ["+350 créditos/mês"] },
  brain_scale: { brainAddonCredits: 900, highlights: ["+900 créditos/mês"] }
};

export function formatLimit(value, label) {
  if (value == null) return `${label}: ilimitado`;
  return `${label}: ${Number(value).toLocaleString("pt-BR")}`;
}

export function entitlementsForProductKey(key) {
  return STRIPE_PLAN_ENTITLEMENTS[String(key || "").toLowerCase()] || null;
}
