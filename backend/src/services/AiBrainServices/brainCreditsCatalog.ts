/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Catálogo de ações Brain.AI — baseado em docs/precificacao-brain-creditos-consumo.csv */

export type BrainCreditActionType =
  | "chat_simples"
  | "consulta_crm"
  | "acao_crm_simples"
  | "acao_crm_composta"
  | "integracao_externa"
  | "imagem_gemini"
  | "modo_voz"
  | "analise_insights"
  | "relatorio_pdf_excel"
  | "codigo_ide"
  | "figma_prototipo"
  | "transcricao"
  | "sintese_voz";

export type BrainModelTier =
  | "flash"
  | "haiku"
  | "sonnet_gpt4o"
  | "gpt5_5"
  | "fable"
  | "o1";

export interface BrainCreditActionDef {
  id: BrainCreditActionType;
  label: string;
  multipliers: Record<BrainModelTier, number>;
}

export const BRAIN_CREDIT_ACTIONS: Record<BrainCreditActionType, BrainCreditActionDef> = {
  chat_simples: {
    id: "chat_simples",
    label: "Chat simples",
    multipliers: { flash: 1, haiku: 2, sonnet_gpt4o: 5, gpt5_5: 14, fable: 20, o1: 35 }
  },
  consulta_crm: {
    id: "consulta_crm",
    label: "Consulta CRM",
    multipliers: { flash: 2, haiku: 4, sonnet_gpt4o: 10, gpt5_5: 28, fable: 40, o1: 70 }
  },
  acao_crm_simples: {
    id: "acao_crm_simples",
    label: "Ação CRM simples",
    multipliers: { flash: 3, haiku: 6, sonnet_gpt4o: 15, gpt5_5: 42, fable: 60, o1: 105 }
  },
  acao_crm_composta: {
    id: "acao_crm_composta",
    label: "Ação CRM composta",
    multipliers: { flash: 5, haiku: 10, sonnet_gpt4o: 25, gpt5_5: 70, fable: 100, o1: 175 }
  },
  integracao_externa: {
    id: "integracao_externa",
    label: "Integração externa",
    multipliers: { flash: 5, haiku: 10, sonnet_gpt4o: 25, gpt5_5: 70, fable: 100, o1: 175 }
  },
  imagem_gemini: {
    id: "imagem_gemini",
    label: "Imagem Gemini",
    multipliers: { flash: 6, haiku: 12, sonnet_gpt4o: 30, gpt5_5: 84, fable: 120, o1: 210 }
  },
  modo_voz: {
    id: "modo_voz",
    label: "Modo voz (1 turno)",
    multipliers: { flash: 6, haiku: 12, sonnet_gpt4o: 30, gpt5_5: 84, fable: 120, o1: 210 }
  },
  analise_insights: {
    id: "analise_insights",
    label: "Análise / insights",
    multipliers: { flash: 8, haiku: 16, sonnet_gpt4o: 40, gpt5_5: 112, fable: 160, o1: 280 }
  },
  relatorio_pdf_excel: {
    id: "relatorio_pdf_excel",
    label: "Relatório PDF/Excel",
    multipliers: { flash: 10, haiku: 20, sonnet_gpt4o: 50, gpt5_5: 140, fable: 200, o1: 350 }
  },
  codigo_ide: {
    id: "codigo_ide",
    label: "Código IDE Build",
    multipliers: { flash: 15, haiku: 30, sonnet_gpt4o: 75, gpt5_5: 210, fable: 300, o1: 525 }
  },
  figma_prototipo: {
    id: "figma_prototipo",
    label: "Figma protótipo",
    multipliers: { flash: 15, haiku: 30, sonnet_gpt4o: 75, gpt5_5: 210, fable: 300, o1: 525 }
  },
  transcricao: {
    id: "transcricao",
    label: "Transcrição (Whisper)",
    multipliers: { flash: 1, haiku: 2, sonnet_gpt4o: 5, gpt5_5: 14, fable: 20, o1: 35 }
  },
  sintese_voz: {
    id: "sintese_voz",
    label: "Síntese de voz (TTS)",
    multipliers: { flash: 2, haiku: 4, sonnet_gpt4o: 10, gpt5_5: 28, fable: 40, o1: 70 }
  }
};

export const CRM_PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free: 100,
  freemium: 100,
  trial: 100,
  starter: 150,
  essencial: 500,
  pro: 1200
};

export const BRAIN_ADDON_MONTHLY_CREDITS: Record<string, number> = {
  starter: 100,
  lite: 100,
  essencial: 350,
  growth: 350,
  pro: 900,
  scale: 900
};

export interface BrainPlanOffer {
  id: string;
  name: string;
  credits: number;
  monthlyPriceBrl: number;
  annualPriceBrl: number;
  description: string;
  highlight?: boolean;
}

export const BRAIN_PLAN_OFFERS: BrainPlanOffer[] = [
  {
    id: "starter",
    name: "Brain Starter",
    credits: 100,
    monthlyPriceBrl: 97,
    annualPriceBrl: 77,
    description: "Ideal para uso moderado — todos os modelos inclusos."
  },
  {
    id: "essencial",
    name: "Brain Essencial",
    credits: 350,
    monthlyPriceBrl: 247,
    annualPriceBrl: 197,
    description: "Para equipes que usam Brain.AI diariamente.",
    highlight: true
  },
  {
    id: "pro",
    name: "Brain Pro",
    credits: 900,
    monthlyPriceBrl: 497,
    annualPriceBrl: 397,
    description: "Volume alto — IDE, voz, CRM e integrações."
  }
];

export function resolveBrainModelTier(modelId?: string | null): BrainModelTier {
  const m = String(modelId || "").toLowerCase();
  if (m === "flash") return "flash";
  if (m === "auto") return "sonnet_gpt4o";
  if (m.includes("fable") || m.includes("mythos")) return "fable";
  if (m.includes("haiku")) return "haiku";
  if (/\bo[13](-|$|\b)/.test(m) || m.startsWith("o1") || m.startsWith("o3")) return "o1";
  if (m.includes("gpt-5") || m.includes("gpt5")) return "gpt5_5";
  if (
    m.includes("sonnet") ||
    m.includes("opus") ||
    m.includes("gpt-4o") ||
    m.includes("claude-3")
  ) {
    return "sonnet_gpt4o";
  }
  if (m.includes("gemini") && (m.includes("flash") || m.includes("lite"))) return "flash";
  if (m.includes("grok") && (m.includes("mini") || m.includes("fast"))) return "flash";
  if (m.includes("mini") && !m.includes("gpt-5")) return "flash";
  return "sonnet_gpt4o";
}

export function calculateBrainCredits(
  actionType: BrainCreditActionType,
  modelId?: string | null
): number {
  const action = BRAIN_CREDIT_ACTIONS[actionType] || BRAIN_CREDIT_ACTIONS.chat_simples;
  const tier = resolveBrainModelTier(modelId);
  return Math.max(1, action.multipliers[tier] || action.multipliers.flash);
}

export function normalizePlanKey(name?: string | null): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function resolveMonthlyCreditsFromPlanName(planName?: string | null): number {
  const key = normalizePlanKey(planName);
  if (!key) return CRM_PLAN_MONTHLY_CREDITS.free;
  for (const [planKey, credits] of Object.entries(CRM_PLAN_MONTHLY_CREDITS)) {
    if (key.includes(planKey)) return credits;
  }
  return CRM_PLAN_MONTHLY_CREDITS.free;
}

export function resolveBrainAddonCredits(addonPlan?: string | null): number {
  const key = normalizePlanKey(addonPlan);
  if (!key) return 0;
  for (const [planKey, credits] of Object.entries(BRAIN_ADDON_MONTHLY_CREDITS)) {
    if (key.includes(planKey)) return credits;
  }
  return 0;
}

/** Chaves Stripe → plano add-on interno (docs/precificacao-brain-crm-planos.csv) */
export const STRIPE_BRAIN_PRODUCT_TO_ADDON: Record<string, string> = {
  brain_lite: "starter",
  brain_growth: "essencial",
  brain_scale: "pro"
};

export function mapStripeProductToAddon(productKey?: string | null): string | null {
  if (!productKey) return null;
  return STRIPE_BRAIN_PRODUCT_TO_ADDON[String(productKey).toLowerCase()] || null;
}

export function estimateTokenCostUsd(
  provider: string,
  modelId: string,
  promptTokens: number,
  completionTokens: number
): number {
  const tier = resolveBrainModelTier(modelId);
  const rates: Record<BrainModelTier, { in: number; out: number }> = {
    flash: { in: 0.0001, out: 0.0004 },
    haiku: { in: 0.00025, out: 0.00125 },
    sonnet_gpt4o: { in: 0.003, out: 0.015 },
    gpt5_5: { in: 0.005, out: 0.02 },
    fable: { in: 0.01, out: 0.05 },
    o1: { in: 0.015, out: 0.06 }
  };
  const rate = rates[tier];
  const p = promptTokens / 1000;
  const c = completionTokens / 1000;
  if (provider === "gemini") return p * rate.in * 0.8 + c * rate.out * 0.8;
  if (provider === "anthropic") return p * rate.in * 1.1 + c * rate.out * 1.1;
  if (provider === "grok") return p * rate.in * 0.95 + c * rate.out * 0.95;
  return p * rate.in + c * rate.out;
}

export function inferBrainActionType(opts: {
  voiceMode?: boolean;
  toolsUsed?: string[];
  hasCodeSnapshot?: boolean;
  isTranscribe?: boolean;
  isSynthesize?: boolean;
  isImage?: boolean;
}): BrainCreditActionType {
  if (opts.isTranscribe) return "transcricao";
  if (opts.isSynthesize) return "sintese_voz";
  if (opts.isImage) return "imagem_gemini";
  if (opts.voiceMode) return "modo_voz";
  if (opts.hasCodeSnapshot) return "codigo_ide";
  const tools = opts.toolsUsed || [];
  if (tools.some((t) => /hubspot|pipedrive|notion|supabase|clickup/i.test(t))) {
    return "integracao_externa";
  }
  if (tools.length >= 3) return "acao_crm_composta";
  if (tools.length >= 1) return "acao_crm_simples";
  if (tools.some((t) => /dashboard|report|insight|analise/i.test(t))) {
    return "analise_insights";
  }
  return "chat_simples";
}
