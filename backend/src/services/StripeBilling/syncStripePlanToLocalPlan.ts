/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Plan from "../../models/Plan";
import {
  isBrainProduct,
  isCrmProduct,
  listAdminStripeCatalog,
  planLabelForProduct,
  StripeProductKey
} from "../../config/stripeBilling";
import { getMergedPlanEntitlements } from "../../config/stripePlanEntitlements";
import { activateBrainAddonFromStripeProduct } from "../AiBrainServices/BrainCreditService";

function planDefaults() {
  return {
    useWhatsapp: true,
    useFacebook: false,
    useInstagram: false,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    useWhatsappOfficial: false,
    wavoip: false,
    trial: false,
    trialDays: 0,
    isPublic: false,
    queues: 999,
    recurrence: "MENSAL"
  };
}

function limitToPlanField(value?: number | null): number {
  if (value == null) return 0;
  return Number(value) || 0;
}

async function amountBrlForInterval(
  productKey: string,
  interval: "monthly" | "annual" = "monthly"
): Promise<string> {
  const catalog = await listAdminStripeCatalog({
    type: isBrainProduct(productKey) ? "brain" : "crm"
  });
  const product = catalog.find(p => p.key === productKey);
  const row = product?.prices?.find(
    p => p.currency === "brl" && p.interval === interval
  );
  if (row?.unitAmount != null) {
    return String(Number(row.unitAmount) / 100);
  }
  if (interval === "annual") {
    return monthlyAmountBrl(productKey);
  }
  return "0";
}

async function monthlyAmountBrl(productKey: string): Promise<string> {
  return amountBrlForInterval(productKey, "monthly");
}

export async function syncStripePlanToLocalPlan(
  stripeProductKey: string,
  opts?: { interval?: "monthly" | "annual" }
): Promise<{ planId: number; planName: string }> {
  const key = String(stripeProductKey || "").trim().toLowerCase() as StripeProductKey;
  if (!key) throw new AppError("stripeProductKey obrigatório", 400);

  const interval = opts?.interval === "annual" ? "annual" : "monthly";
  const entitlements = await getMergedPlanEntitlements(key);
  if (!entitlements && !isCrmProduct(key) && !isBrainProduct(key)) {
    throw new AppError("Plano Stripe inválido", 400);
  }

  const label = planLabelForProduct(key);
  const amount = await amountBrlForInterval(key, interval);

  let plan =
    (await Plan.findOne({ where: { stripeProductKey: key } as any })) ||
    (await Plan.findOne({ where: { name: label } as any }));

  const base = planDefaults();
  const payload: Record<string, unknown> = {
    ...base,
    name: label,
    stripeProductKey: key,
    amount
  };

  if (isCrmProduct(key) && entitlements) {
    payload.users = limitToPlanField(entitlements.maxUsers);
    payload.connections = limitToPlanField(entitlements.maxConnections);
  } else if (isBrainProduct(key)) {
    payload.users = 0;
    payload.connections = 0;
  }

  if (plan) {
    await plan.update({
      ...(payload as any),
      useWhatsappOfficial: plan.useWhatsappOfficial,
      wavoip: plan.wavoip
    });
  } else {
    plan = await Plan.create(payload as any);
  }

  return { planId: Number(plan.id), planName: label };
}

export async function applyStripeProductToCompany(opts: {
  companyId: number;
  stripeProductKey: string;
  interval?: "monthly" | "annual";
}): Promise<{ planId: number }> {
  const { planId } = await syncStripePlanToLocalPlan(opts.stripeProductKey, {
    interval: opts.interval
  });
  const key = opts.stripeProductKey as StripeProductKey;

  if (isBrainProduct(key)) {
    await activateBrainAddonFromStripeProduct(opts.companyId, key);
  }

  return { planId };
}
