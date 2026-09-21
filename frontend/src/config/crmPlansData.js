/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Catálogo CRM — estrutura de planos (sem IDs/links Stripe embutidos).
 * O comprador configura prices e Payment Links via .env / painel Stripe.
 */

export const CRM_ANNUAL_TOTALS = {
  starter: 0,
  essencial: 0,
  pro: 0
};

export const CRM_PLAN_CREDITS = {
  starter: 300,
  essencial: 1000,
  pro: 3000
};

export function formatBrainCredits(credits) {
  return credits >= 1000
    ? `${(credits / 1000).toLocaleString("pt-BR")}.000`
    : credits.toLocaleString("pt-BR");
}

export const CRM_PLAN_PRICES = {
  starter: { mensal: 0, anual: 0 },
  essencial: { mensal: 0, anual: 0 },
  pro: { mensal: 0, anual: 0 }
};

/** Add-on opcional — IDs vêm de STRIPE_PRICE_ONBOARDING_* no .env */
export const CRM_ONBOARDING_ADDON = {
  name: "Treinamento + Implantação",
  price: 0,
  description:
    "Treinamentos ao vivo + implantação do sistema + acompanhamento via suporte.",
  maxInstallments: 12,
  installmentOnlyOnMonthly: true,
  stripeProductId: "",
  stripePriceBrl: "",
  stripePriceUsd: ""
};

/** Preencha via env / painel — sem Payment Links LIVE embutidos neste pacote. */
export const CRM_STRIPE_CHECKOUT_URLS = {
  starter: { mensal: "", anual: "" },
  essencial: { mensal: "", anual: "" },
  pro: { mensal: "", anual: "" }
};

export function getCrmCheckoutUrl(plan, cycle) {
  const normalizedCycle = cycle === "semestral" ? "mensal" : cycle;
  const url = CRM_STRIPE_CHECKOUT_URLS[plan]?.[normalizedCycle] || null;
  return url && String(url).trim() ? url : null;
}

export function getCrmPlanPrice(plan, cycle) {
  const normalizedCycle = cycle === "semestral" ? "mensal" : cycle;
  return CRM_PLAN_PRICES[plan]?.[normalizedCycle] ?? null;
}

const starterFeatures = [
  "Criação e gerenciamento de negócios e produtos.",
  "Gerenciamento de leads com controle de tags.",
  "Cadastro de membros da empresa.",
  `Brain.IA com ${formatBrainCredits(CRM_PLAN_CREDITS.starter)} créditos inclusos.`,
  "Automação para interagir com leads.",
  "Multi-Atendimento com conexões WhatsApp.",
  "Integração com IA: Claude, OpenAI e Gemini.",
  "Dashboards de negócios das pipelines."
];

const essencialFeatures = [
  "Criação e gerenciamento de pipeline.",
  "Criação e gerenciamento de negócios e produtos.",
  "Gerenciamento ampliado de leads com tags.",
  "Cadastro de membros na empresa.",
  `Brain.IA com ${formatBrainCredits(CRM_PLAN_CREDITS.essencial)} créditos inclusos.`,
  "Automação para interagir com leads.",
  "Multi-Atendimento com mais conexões.",
  "Integração com IA: Claude, OpenAI e Gemini.",
  "Dashboards de negócios das pipelines.",
  "Acesso à API para integração com outras ferramentas."
];

const proFeatures = [
  "Criação e gerenciamento de pipelines ilimitadas.",
  "Gerenciamento ilimitado de leads com controle de tags.",
  "Criação e gerenciamento de negócios e produtos.",
  "Cadastro ilimitado de membros na empresa.",
  `Brain.IA com ${formatBrainCredits(CRM_PLAN_CREDITS.pro)} créditos inclusos.`,
  "Automações para otimizar interações com leads.",
  "Multi-Atendimento com conexões amplas.",
  "Integração com IA: Claude, OpenAI e Gemini.",
  "Dashboards de negócios das pipelines.",
  "Acesso à API para integração com outras ferramentas."
];

export const CRM_PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    description:
      "Para quem está começando, com recursos essenciais e limites ideais para pequenas equipes.",
    features: starterFeatures,
    prices: CRM_PLAN_PRICES.starter,
    annualTotal: CRM_ANNUAL_TOTALS.starter
  },
  {
    id: "essencial",
    name: "Essencial",
    description:
      "Funcionalidades avançadas e limites ampliados para empresas em crescimento constante.",
    badge: "Melhor preço",
    highlight: true,
    features: essencialFeatures,
    prices: CRM_PLAN_PRICES.essencial,
    annualTotal: CRM_ANNUAL_TOTALS.essencial
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Para operações de alta escala com automações avançadas e suporte enterprise.",
    badge: "Mais vendido",
    dark: true,
    features: proFeatures,
    prices: CRM_PLAN_PRICES.pro,
    annualTotal: CRM_ANNUAL_TOTALS.pro
  }
];
