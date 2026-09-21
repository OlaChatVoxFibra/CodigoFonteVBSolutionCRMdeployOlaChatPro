/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import logger from "../utils/logger";
import { listPublicStripeCatalog } from "../config/stripeBilling";
import {
  createCheckoutSession,
  getCompanyStripeStatus,
  handleStripeWebhookEvent,
  listPlatformStripeSubscriptions,
  listEnrichedStripeCatalog,
  resolvePublicPayRedirect
} from "../services/StripeBilling/StripeBillingService";
import { getStripeClient } from "../config/stripeBilling";
import { isPlatformAdminEmail } from "../helpers/isPlatformAdmin";
import User from "../models/User";
import {
  adminCancelSubscription,
  adminCreateSubscriptionForCustomer,
  adminMarkInvoiceUncollectible,
  adminReactivateSubscription,
  adminVoidInvoice,
  listAdminPlansCatalog,
  updateAdminPlanEntitlements,
  updateAdminPlanPrice
} from "../services/StripeBilling/StripeBillingAdminService";
import { listUnifiedSubscribers } from "../services/StripeBilling/listUnifiedSubscribers";

async function resolveRequestEmail(req: Request): Promise<string> {
  const cached = (req.user as { email?: string })?.email;
  if (cached) return cached;
  const row = await User.findByPk(Number((req.user as any).id), { attributes: ["email"] });
  return String(row?.email || "");
}

async function assertPlatformAdmin(req: Request): Promise<string> {
  const email = await resolveRequestEmail(req);
  if (!isPlatformAdminEmail(email)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  return email;
}

export const listPlans = async (req: Request, res: Response): Promise<Response> => {
  const type = String(req.query.type || "crm").toLowerCase();
  const catalogType =
    type === "brain" ? "brain" : type === "all" ? "all" : "crm";
  const products = await listPublicStripeCatalog({ type: catalogType });
  return res.json({ products });
};

export const listPlansEnriched = async (req: Request, res: Response): Promise<Response> => {
  const type = String(req.query.type || "all").toLowerCase();
  const catalogType =
    type === "brain" ? "brain" : type === "crm" ? "crm" : "all";
  const products = await listEnrichedStripeCatalog({ type: catalogType });
  return res.json({ products });
};

/** Catálogo admin — todos os planos Stripe + limites editáveis */
export const adminPlansCatalog = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const type = String(req.query.type || "all").toLowerCase();
  const catalogType =
    type === "brain" ? "brain" : type === "crm" ? "crm" : "all";
  const data = await listAdminPlansCatalog({ type: catalogType });
  return res.json(data);
};

export const adminUpdatePlanEntitlements = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const productKey = String(req.params.productKey || "");
  const entitlements = await updateAdminPlanEntitlements(productKey, req.body || {});
  return res.json({ productKey, entitlements });
};

export const adminUpdatePlanPrice = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const productKey = String(req.params.productKey || "");
  const { currency, interval, unitAmountCents } = req.body || {};
  const price = await updateAdminPlanPrice({
    productKey,
    currency,
    interval,
    unitAmountCents: Number(unitAmountCents)
  });
  return res.json({ productKey, price });
};

export const adminCreateSubscription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const { email, productKey, interval, currency, customerName, sendInvoice } =
    req.body || {};
  const result = await adminCreateSubscriptionForCustomer({
    email: String(email || ""),
    productKey: String(productKey || ""),
    interval: interval ? String(interval) : "monthly",
    currency: currency ? String(currency) : "brl",
    customerName: customerName ? String(customerName) : undefined,
    sendInvoice: Boolean(sendInvoice)
  });
  return res.json(result);
};

export const adminCancelSubscriptionHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const subscriptionId = String(req.params.subscriptionId || "");
  const immediately = Boolean(req.body?.immediately);
  const result = await adminCancelSubscription({ subscriptionId, immediately });
  return res.json(result);
};

export const adminReactivateSubscriptionHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const subscriptionId = String(req.params.subscriptionId || "");
  const result = await adminReactivateSubscription(subscriptionId);
  return res.json(result);
};

export const adminVoidInvoiceHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const invoiceId = String(req.params.invoiceId || "");
  const result = await adminVoidInvoice(invoiceId);
  return res.json(result);
};

export const adminMarkInvoiceUncollectibleHandler = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const invoiceId = String(req.params.invoiceId || "");
  const result = await adminMarkInvoiceUncollectible(invoiceId);
  return res.json(result);
};

/** Lista unificada — assinantes Stripe + manual/pré-integração */
export const adminUnifiedSubscribers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertPlatformAdmin(req);
  const q = req.query as Record<string, string | undefined>;
  const natureRaw = q.nature;
  const data = await listUnifiedSubscribers({
    filters: {
      nature:
        natureRaw === "freemium" || natureRaw === "cadastro_gratis"
          ? natureRaw
          : "all",
      dateFrom: q.dateFrom,
      dateTo: q.dateTo,
      uf: q.uf
    },
    stripeStatus: q.stripeStatus === "active_only" ? "active_only" : "all",
    stripeLimit: Number(q.limit) || 100
  });
  return res.json(data);
};

/** Todas as assinaturas Stripe — admin plataforma */
export const platformSubscriptions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const email = await resolveRequestEmail(req);
  if (!isPlatformAdminEmail(email)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const limit = Number(req.query.limit) || 100;
  const status = String(req.query.status || "active_only");
  const data = await listPlatformStripeSubscriptions({
    limit,
    status: status as any
  });
  return res.json(data);
};

export const listPlansPublic = async (req: Request, res: Response): Promise<Response> => {
  const type = String(req.query.type || "crm").toLowerCase();
  const catalogType =
    type === "brain" ? "brain" : type === "all" ? "all" : "crm";
  const products = await listPublicStripeCatalog({ type: catalogType });
  return res.json({ products });
};

export const status = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = await getCompanyStripeStatus(companyId);
  if (!data) throw new AppError("Company not found", 404);
  return res.json(data);
};

export const checkout = async (req: Request, res: Response): Promise<Response> => {
  const { productKey, currency, interval, cancelUrl, includeOnboarding } = req.body || {};
  if (!productKey) throw new AppError("productKey obrigatório", 400);
  const { companyId } = req.user;
  const session = await createCheckoutSession({
    productKey: String(productKey),
    currency: currency ? String(currency) : "brl",
    interval: interval ? String(interval) : "monthly",
    email: (req.user as any)?.email,
    companyId,
    cancelUrl: cancelUrl ? String(cancelUrl) : undefined,
    includeOnboarding: Boolean(includeOnboarding)
  });
  return res.json({ url: session.url, sessionId: session.id });
};

export const publicCheckout = async (req: Request, res: Response): Promise<Response> => {
  const { productKey, currency, interval, email, includeOnboarding } = req.body || {};
  if (!productKey) throw new AppError("productKey obrigatório", 400);
  try {
    const session = await createCheckoutSession({
      productKey: String(productKey),
      currency: currency ? String(currency) : "brl",
      interval: interval ? String(interval) : "monthly",
      email: email ? String(email) : undefined,
      includeOnboarding: Boolean(includeOnboarding)
    });
    return res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    logger.error({ msg: "Stripe publicCheckout", error: (e as Error).message });
    throw new AppError("Erro ao abrir checkout", 500);
  }
};

export const publicPay = async (req: Request, res: Response): Promise<void> => {
  const productKey = String(req.query.productKey || "");
  const currency = String(req.query.currency || "brl");
  const interval = String(req.query.interval || "monthly");
  const email = req.query.email ? String(req.query.email) : undefined;
  const includeOnboarding =
    String(req.query.includeOnboarding || "").toLowerCase() === "true";
  if (!productKey) {
    res.status(400).send("productKey obrigatório");
    return;
  }
  try {
    const url = await resolvePublicPayRedirect({
      productKey,
      currency,
      interval,
      email,
      includeOnboarding
    });
    if (!url) {
      res.status(404).send("Checkout não encontrado");
      return;
    }
    res.redirect(302, url);
  } catch (e) {
    logger.error({ msg: "Stripe publicPay", error: (e as Error).message });
    res.status(500).send("Erro ao abrir checkout");
  }
};

export const webhook = async (req: Request, res: Response): Promise<Response> => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const stripe = await getStripeClient();
  if (!stripe) {
    return res.status(503).json({ error: "Stripe não configurado" });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "Assinatura ausente" });
  }

  const rawBody = (req as any).rawBody as string | undefined;
  if (!rawBody) {
    return res.status(400).json({ error: "Corpo bruto ausente" });
  }

  let event;
  try {
    if (secret) {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } else {
      logger.warn("STRIPE_WEBHOOK_SECRET vazio — webhook sem validação de assinatura");
      event = JSON.parse(rawBody);
    }
  } catch (err) {
    logger.warn({ msg: "Stripe webhook assinatura inválida", error: (err as Error).message });
    return res.status(400).json({ error: "Assinatura inválida" });
  }

  try {
    await handleStripeWebhookEvent(event);
    return res.json({ received: true });
  } catch (e) {
    logger.error({ msg: "Stripe webhook handler", error: (e as Error).message });
    return res.status(500).json({ error: "handler error" });
  }
};
