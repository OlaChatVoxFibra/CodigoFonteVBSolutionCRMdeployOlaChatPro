/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export {
  CRM_PLAN_CREDITS,
  CRM_PRICING_PLANS,
  formatBrainCredits,
  CRM_PLAN_PRICES,
  CRM_STRIPE_CHECKOUT_URLS,
  getCrmCheckoutUrl,
  getCrmPlanPrice
} from "./crmPlansData";

export const BRAIN_SHARED_FEATURES = [
  "Todos os modelos: GPT, Claude e Gemini.",
  "Modo voz · Whisper + síntese de fala.",
  "IDE Build com preview ao vivo.",
  "Contexto CRM · leads, negócios e tickets.",
  "Conectores MCP · Figma, GitHub e mais.",
  "Renova a cada ciclo · sem acúmulo.",
];

export const BRAIN_PLAN_CREDITS = {
  starter: 100,
  essencial: 350,
  pro: 900
};

/** Comparação de valor agregado — estilo Claude (tabela de recursos) */
export const BRAIN_PRICING_FEATURES = [
  {
    name: "Créditos Brain.AI por mês",
    highlight: true,
    values: {
      starter: "100",
      essencial: "350",
      pro: "900"
    }
  },
  {
    name: "Conversas estimadas",
    values: {
      starter: "~100/mês",
      essencial: "~350/mês",
      pro: "~900/mês"
    }
  },
  {
    name: "Modelos de IA",
    values: {
      starter: "Todos liberados",
      essencial: "Todos liberados",
      pro: "Todos liberados"
    }
  },
  {
    name: "OpenAI, Claude e Gemini",
    values: { starter: true, essencial: true, pro: true }
  },
  {
    name: "Modo voz (Whisper + TTS)",
    values: { starter: true, essencial: true, pro: true }
  },
  {
    name: "IDE Build com preview",
    values: { starter: true, essencial: true, pro: true }
  },
  {
    name: "Contexto CRM",
    values: {
      starter: "Básico",
      essencial: "Expandido",
      pro: "Equipe completa"
    }
  },
  {
    name: "Integrações externas",
    values: {
      starter: "—",
      essencial: "API e webhooks",
      pro: "API, webhooks e escala"
    }
  },
  {
    name: "Relatórios exportáveis",
    values: { starter: false, essencial: true, pro: true }
  },
  {
    name: "Prioridade de processamento",
    values: { starter: false, essencial: true, pro: true }
  },
  {
    name: "Suporte prioritário",
    values: { starter: false, essencial: false, pro: true }
  }
];

export const BRAIN_VALUE_HIGHLIGHTS = [
  {
    title: "Três provedores, um só lugar",
    description: "OpenAI, Claude e Gemini sem trocar de ferramenta — use o melhor modelo para cada tarefa."
  },
  {
    title: "Créditos que renovam todo mês",
    description: "Volume previsível para sua operação. Sem surpresas na fatura, sem acúmulo confuso."
  },
  {
    title: "IA conectada ao seu CRM",
    description: "Leads, negócios e tickets no contexto — respostas com dados reais da sua empresa."
  }
];

export const BRAIN_PLAN_VALUE = {
  starter: {
    hero: "100 créditos/mês",
    subtitle: "Até ~100 conversas · modelos Flash",
  },
  essencial: {
    hero: "350 créditos/mês",
    subtitle: "Até ~350 conversas · uso diário",
  },
  pro: {
    hero: "900 créditos/mês",
    subtitle: "Até ~900 conversas · equipes e escala",
  },
};

export const BRAIN_PRICING_PLANS = [
  {
    id: "starter",
    name: "Brain Starter",
    description: "Ideal para uso moderado — todos os recursos inclusos.",
    credits: BRAIN_PLAN_CREDITS.starter,
    value: BRAIN_PLAN_VALUE.starter,
    features: BRAIN_SHARED_FEATURES,
    prices: { mensal: 0, anual: 0 },
    annualTotal: 0,
  },
  {
    id: "essencial",
    name: "Brain Essencial",
    description: "Para equipes que usam Brain.AI no dia a dia.",
    badge: "Recomendado",
    highlight: true,
    credits: BRAIN_PLAN_CREDITS.essencial,
    value: BRAIN_PLAN_VALUE.essencial,
    features: BRAIN_SHARED_FEATURES,
    prices: { mensal: 0, anual: 0 },
    annualTotal: 0,
  },
  {
    id: "pro",
    name: "Brain Pro",
    description: "Volume alto para operações e equipes em escala.",
    badge: "Mais créditos",
    credits: BRAIN_PLAN_CREDITS.pro,
    value: BRAIN_PLAN_VALUE.pro,
    features: BRAIN_SHARED_FEATURES,
    prices: { mensal: 0, anual: 0 },
    annualTotal: 0,
  },
];
