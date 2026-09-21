/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type { StripeProductKey } from "./stripeBilling";
import { getEntitlementsOverrides } from "../services/StripeBilling/stripePlanSettingsService";

export type PlanEntitlements = {
  maxUsers?: number | null;
  maxConnections?: number | null;
  maxLeads?: number | null;
  brainCreditsIncluded?: number | null;
  brainAddonCredits?: number | null;
  webhooks?: number | null;
  apiAccess?: boolean;
  highlights: string[];
  features: string[];
};

const CRM_ENTITLEMENTS: Record<string, PlanEntitlements> = {
  starter: {
    maxUsers: 3,
    maxConnections: 3,
    maxLeads: 10_000,
    brainCreditsIncluded: 300,
    brainAddonCredits: null,
    webhooks: 2,
    apiAccess: false,
    highlights: ["3 usuários", "3 conexões multi-atendimento", "300 créditos Brain/mês"],
    features: [
      "Até 3 usuários na empresa",
      "Até 3 conexões de multi-atendimento (WhatsApp, etc.)",
      "Até 10 mil leads com tags",
      "300 créditos Brain.AI inclusos por mês",
      "Automações ilimitadas",
      "IA: OpenAI, Claude e Gemini",
      "Integrações CRM, Google e Figma",
      "2 webhooks",
      "Dashboards de pipeline"
    ]
  },
  essencial: {
    maxUsers: 15,
    maxConnections: 10,
    maxLeads: 100_000,
    brainCreditsIncluded: 1_000,
    brainAddonCredits: null,
    webhooks: 15,
    apiAccess: true,
    highlights: ["15 usuários", "10 conexões multi-atendimento", "1.000 créditos Brain/mês"],
    features: [
      "Até 15 usuários na empresa",
      "Até 10 conexões de multi-atendimento",
      "Até 100 mil leads com tags",
      "1.000 créditos Brain.AI inclusos por mês",
      "Pipelines ilimitadas",
      "Automações ilimitadas",
      "IA: OpenAI, Claude e Gemini",
      "Integrações CRM, Google e Figma",
      "15 webhooks",
      "Acesso à API",
      "Dashboards de pipeline"
    ]
  },
  pro: {
    maxUsers: null,
    maxConnections: null,
    maxLeads: null,
    brainCreditsIncluded: 3_000,
    brainAddonCredits: null,
    webhooks: null,
    apiAccess: true,
    highlights: ["Usuários ilimitados", "Conexões ilimitadas", "3.000 créditos Brain/mês"],
    features: [
      "Usuários ilimitados",
      "Conexões multi-atendimento ilimitadas",
      "Leads ilimitados com tags",
      "3.000 créditos Brain.AI inclusos por mês",
      "Pipelines ilimitadas",
      "Automações ilimitadas",
      "IA: OpenAI, Claude e Gemini",
      "Integrações CRM, Google e Figma",
      "Webhooks ilimitados",
      "Acesso à API",
      "Suporte prioritário"
    ]
  },
  brain_lite: {
    brainAddonCredits: 100,
    highlights: ["+100 créditos Brain/mês", "Todos os modelos IA"],
    features: [
      "100 créditos Brain.AI extras por mês (add-on)",
      "OpenAI, Claude e Gemini",
      "Modo voz · IDE Build · CRM · MCP",
      "Renova a cada ciclo · sem acúmulo"
    ]
  },
  brain_growth: {
    brainAddonCredits: 350,
    highlights: ["+350 créditos Brain/mês", "Uso diário"],
    features: [
      "350 créditos Brain.AI extras por mês (add-on)",
      "OpenAI, Claude e Gemini",
      "Modo voz · IDE Build · CRM · MCP",
      "Integrações externas ampliadas",
      "Renova a cada ciclo · sem acúmulo"
    ]
  },
  brain_scale: {
    brainAddonCredits: 900,
    highlights: ["+900 créditos Brain/mês", "Equipes em escala"],
    features: [
      "900 créditos Brain.AI extras por mês (add-on)",
      "OpenAI, Claude e Gemini",
      "Modo voz · IDE Build · CRM · MCP",
      "Volume alto · IDE e integrações",
      "Renova a cada ciclo · sem acúmulo"
    ]
  }
};

export function getPlanEntitlements(productKey?: string | null): PlanEntitlements | null {
  const key = String(productKey || "").trim().toLowerCase();
  if (!key) return null;
  return CRM_ENTITLEMENTS[key] || null;
}

export async function getMergedPlanEntitlements(
  productKey?: string | null
): Promise<PlanEntitlements | null> {
  const base = getPlanEntitlements(productKey);
  if (!base) return null;
  const key = String(productKey || "").trim().toLowerCase() as StripeProductKey;
  const overrides = await getEntitlementsOverrides();
  const patch = overrides[key];
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    highlights: patch.highlights?.length ? patch.highlights : base.highlights,
    features: patch.features?.length ? patch.features : base.features
  };
}

export async function enrichCatalogProductAsync<T extends { key: string }>(
  product: T
): Promise<T & { entitlements: PlanEntitlements | null }> {
  return {
    ...product,
    entitlements: await getMergedPlanEntitlements(product.key as StripeProductKey)
  };
}

export function enrichCatalogProduct<T extends { key: string }>(
  product: T
): T & { entitlements: PlanEntitlements | null } {
  return {
    ...product,
    entitlements: getPlanEntitlements(product.key as StripeProductKey)
  };
}
