/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import FindAllCompaniesService, {
  ListCompaniesFilters
} from "../CompanyService/FindAllCompaniesService";
import Company from "../../models/Company";
import {
  listPlatformStripeSubscriptions,
  PlatformStripeSubscriptionRow
} from "./StripeBillingService";

export type UnifiedSubscriberOrigin = "stripe" | "manual" | "stripe_plan";

export type UnifiedSubscriberRow = {
  id: number | null;
  name: string;
  email: string;
  phone: string | null;
  planId: number | null;
  planName: string;
  planAmount: number | null;
  stripeProductKey: string | null;
  status: boolean | null;
  origin: UnifiedSubscriberOrigin;
  dueDate: string | null;
  recurrence: string | null;
  createdAt: string | null;
  lastLogin: string | null;
  document: string | null;
  paymentMethod: string | null;
  generateInvoice: boolean | null;
  stripe: PlatformStripeSubscriptionRow | null;
};

function normalizeEmail(email?: string | null): string {
  return String(email || "").trim().toLowerCase();
}

function companyToRow(
  company: Company,
  stripe: PlatformStripeSubscriptionRow | null,
  origin: UnifiedSubscriberOrigin
): UnifiedSubscriberRow {
  const plan = (company as any).plan;
  return {
    id: Number(company.id),
    name: company.name || "",
    email: company.email || "",
    phone: company.phone || null,
    planId: company.planId != null ? Number(company.planId) : null,
    planName: plan?.name || stripe?.planLabel || "—",
    planAmount:
      plan?.amount != null
        ? Number(plan.amount)
        : stripe?.amountCents != null
        ? stripe.amountCents / 100
        : null,
    stripeProductKey: (company as any).stripeProductKey || stripe?.productKey || null,
    status: company.status != null ? Boolean(company.status) : null,
    origin,
    dueDate: company.dueDate ? String(company.dueDate).slice(0, 10) : stripe?.localDueDate || null,
    recurrence: company.recurrence || null,
    createdAt: company.createdAt ? String(company.createdAt) : null,
    lastLogin: company.lastLogin ? String(company.lastLogin) : null,
    document: company.document || null,
    paymentMethod: company.paymentMethod || null,
    generateInvoice:
      company.generateInvoice != null ? Boolean(company.generateInvoice) : null,
    stripe
  };
}

export async function listUnifiedSubscribers(opts?: {
  filters?: ListCompaniesFilters;
  stripeStatus?: "all" | "active_only";
  stripeLimit?: number;
}): Promise<{
  configured: boolean;
  subscribers: UnifiedSubscriberRow[];
  stats: { total: number; stripe: number; manual: number; stripePlan: number; activeMrrCents: number };
}> {
  const filters = opts?.filters;
  const companies = await FindAllCompaniesService(filters);
  const stripeData = await listPlatformStripeSubscriptions({
    limit: opts?.stripeLimit || 100,
    status: opts?.stripeStatus || "all"
  });

  const stripeByCompanyId = new Map<number, PlatformStripeSubscriptionRow>();
  const stripeByEmail = new Map<string, PlatformStripeSubscriptionRow>();
  for (const sub of stripeData.subscriptions) {
    if (sub.companyId) stripeByCompanyId.set(Number(sub.companyId), sub);
    const email = normalizeEmail(sub.customerEmail);
    if (email) stripeByEmail.set(email, sub);
  }

  const matchedStripeIds = new Set<string>();
  const rows: UnifiedSubscriberRow[] = [];

  for (const company of companies) {
    const email = normalizeEmail(company.email);
    const stripe =
      stripeByCompanyId.get(Number(company.id)) ||
      (email ? stripeByEmail.get(email) : null) ||
      null;

    if (stripe) matchedStripeIds.add(stripe.subscriptionId);

    const stripeKey = String((company as any).stripeProductKey || "").trim();
    let origin: UnifiedSubscriberOrigin = "manual";
    if (stripe && (stripe.status === "active" || stripe.status === "trialing")) {
      origin = "stripe";
    } else if (stripeKey || stripe?.productKey) {
      origin = "stripe_plan";
    }

    rows.push(companyToRow(company, stripe, origin));
  }

  for (const sub of stripeData.subscriptions) {
    if (matchedStripeIds.has(sub.subscriptionId)) continue;
    rows.push({
      id: sub.companyId,
      name: sub.companyName || sub.customerName || sub.customerEmail || "—",
      email: sub.customerEmail || "",
      phone: null,
      planId: null,
      planName: sub.planLabel || sub.productKey || "—",
      planAmount: sub.amountCents != null ? sub.amountCents / 100 : null,
      stripeProductKey: sub.productKey,
      status: sub.localSubscriptionActive,
      origin: "stripe",
      dueDate: sub.localDueDate || (sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd * 1000).toISOString().slice(0, 10)
        : null),
      recurrence: sub.interval === "annual" ? "ANUAL" : "MENSAL",
      createdAt: sub.created ? new Date(sub.created * 1000).toISOString() : null,
      lastLogin: null,
      document: null,
      paymentMethod: null,
      generateInvoice: null,
      stripe: sub
    });
  }

  rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));

  const activeMrrCents = stripeData.subscriptions
    .filter(s => s.status === "active" && s.interval === "monthly" && s.amountCents)
    .reduce((sum, s) => sum + Number(s.amountCents), 0);

  return {
    configured: stripeData.configured,
    subscribers: rows,
    stats: {
      total: rows.length,
      stripe: rows.filter(r => r.origin === "stripe").length,
      manual: rows.filter(r => r.origin === "manual").length,
      stripePlan: rows.filter(r => r.origin === "stripe_plan").length,
      activeMrrCents
    }
  };
}
