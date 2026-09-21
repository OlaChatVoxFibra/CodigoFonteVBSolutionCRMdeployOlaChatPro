/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Stripe from "stripe";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";
import Subscriptions from "../../models/Subscriptions";
import logger from "../../utils/logger";
import {
  getStripeClient,
  listAdminStripeCatalog,
  normalizeInterval,
  planLabelForProduct,
  resolvePriceId,
  resolveProductKeyFromPriceId,
  StripeProductKey
} from "../../config/stripeBilling";
import {
  getMergedPlanEntitlements,
  PlanEntitlements
} from "../../config/stripePlanEntitlements";
import {
  enrichCatalogProductAsync
} from "../../config/stripePlanEntitlements";
import {
  getEntitlementsOverrides,
  getPriceOverrides,
  resolveEffectivePriceId,
  resolveProductKeyFromAnyPriceId,
  saveEntitlementsOverride,
  savePriceOverride
} from "./stripePlanSettingsService";
import {
  createCheckoutSession,
  processApprovedStripePayment
} from "./StripeBillingService";

async function findCompanyByEmail(email: string): Promise<Company | null> {
  const q = String(email || "").trim();
  if (!q) return null;
  const company = await Company.findOne({
    where: { email: { [Op.iLike]: q } } as any
  });
  if (company) return company;
  const user = await User.findOne({
    where: { email: { [Op.iLike]: q } } as any
  });
  if (!user) return null;
  return Company.findByPk(user.companyId as any);
}

async function syncLocalAfterSubscriptionCancel(subscription: Stripe.Subscription) {
  const stripe = await getStripeClient();
  if (!stripe) return;
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;
  let email = "";
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && "email" in customer && customer.email) {
      email = customer.email.trim();
    }
  } catch {
    return;
  }
  const company = await findCompanyByEmail(email);
  if (!company) return;
  await company.update({ status: false } as any);
  const sub = await Subscriptions.findOne({
    where: { companyId: company.id } as any
  });
  if (sub) await sub.update({ isActive: false } as any);
  logger.info({ msg: "Stripe admin: assinatura cancelada localmente", companyId: company.id, email });
}

export async function listAdminPlansCatalog(opts?: { type?: "crm" | "brain" | "all" }) {
  const products = await listAdminStripeCatalog(opts);
  const enriched = await Promise.all(products.map(enrichCatalogProductAsync));
  const priceOverrides = await getPriceOverrides();
  const entitlementsOverrides = await getEntitlementsOverrides();
  return {
    products: enriched,
    priceOverrides,
    entitlementsOverrides
  };
}

const VALID_PRODUCT_KEYS = new Set([
  "starter",
  "essencial",
  "pro",
  "brain_lite",
  "brain_growth",
  "brain_scale"
]);

export async function updateAdminPlanEntitlements(
  productKey: string,
  patch: Partial<PlanEntitlements>
) {
  const key = String(productKey || "").trim().toLowerCase() as StripeProductKey;
  if (!VALID_PRODUCT_KEYS.has(key)) throw new AppError("Plano inválido", 400);
  await saveEntitlementsOverride(key, patch);
  return getMergedPlanEntitlements(key);
}

export async function updateAdminPlanPrice(opts: {
  productKey: string;
  currency?: string;
  interval?: string;
  unitAmountCents: number;
}) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);

  const productKey = opts.productKey as StripeProductKey;
  const currency = (opts.currency || "brl").toLowerCase();
  const interval = normalizeInterval(opts.interval || "monthly");
  const unitAmount = Math.round(Number(opts.unitAmountCents));
  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    throw new AppError("Valor inválido", 400);
  }

  const currentPriceId = await resolveEffectivePriceId(
    productKey,
    currency,
    interval,
    resolvePriceId
  );

  let productId: string;
  if (currentPriceId) {
    const price = await stripe.prices.retrieve(currentPriceId);
    productId =
      typeof price.product === "string" ? price.product : price.product.id;
  } else {
    const created = await stripe.products.create({
      name: planLabelForProduct(productKey),
      metadata: { productKey, vb_catalog: "true" }
    });
    productId = created.id;
  }

  const newPrice = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency,
    recurring: { interval: interval === "annual" ? "year" : "month" },
    metadata: { productKey, interval, currency }
  });

  await savePriceOverride(productKey, currency as any, interval, newPrice.id);

  if (currentPriceId && currentPriceId !== newPrice.id) {
    try {
      await stripe.prices.update(currentPriceId, { active: false });
    } catch (e) {
      logger.warn({
        msg: "Stripe: não foi possível desativar preço antigo",
        priceId: currentPriceId,
        error: (e as Error).message
      });
    }
  }

  await stripe.products.update(productId, {
    metadata: { productKey, vb_catalog: "true" }
  });

  return {
    priceId: newPrice.id,
    unitAmount: newPrice.unit_amount,
    currency: newPrice.currency,
    interval
  };
}

export async function adminCancelSubscription(opts: {
  subscriptionId: string;
  immediately?: boolean;
}) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);
  const subId = String(opts.subscriptionId || "").trim();
  if (!subId) throw new AppError("subscriptionId obrigatório", 400);

  if (opts.immediately) {
    const canceled = await stripe.subscriptions.cancel(subId);
    await syncLocalAfterSubscriptionCancel(canceled);
    return { subscription: canceled, mode: "immediate" as const };
  }

  const updated = await stripe.subscriptions.update(subId, {
    cancel_at_period_end: true
  });
  return { subscription: updated, mode: "at_period_end" as const };
}

export async function adminReactivateSubscription(subscriptionId: string) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);
  const subId = String(subscriptionId || "").trim();
  if (!subId) throw new AppError("subscriptionId obrigatório", 400);
  const updated = await stripe.subscriptions.update(subId, {
    cancel_at_period_end: false
  });
  return { subscription: updated };
}

export async function adminVoidInvoice(invoiceId: string) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);
  const id = String(invoiceId || "").trim();
  if (!id) throw new AppError("invoiceId obrigatório", 400);
  const invoice = await stripe.invoices.voidInvoice(id);
  return { invoice };
}

export async function adminMarkInvoiceUncollectible(invoiceId: string) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);
  const id = String(invoiceId || "").trim();
  if (!id) throw new AppError("invoiceId obrigatório", 400);
  const invoice = await stripe.invoices.markUncollectible(id);
  return { invoice };
}

export async function adminCreateSubscriptionForCustomer(opts: {
  email: string;
  productKey: string;
  interval?: string;
  currency?: string;
  customerName?: string;
  sendInvoice?: boolean;
}) {
  const stripe = await getStripeClient();
  if (!stripe) throw new AppError("Stripe não configurado", 503);

  const email = String(opts.email || "").trim();
  if (!email) throw new AppError("E-mail obrigatório", 400);

  const productKey = opts.productKey as StripeProductKey;
  const interval = normalizeInterval(opts.interval || "monthly");
  const currency = (opts.currency || "brl").toLowerCase();
  const priceId = await resolveEffectivePriceId(
    productKey,
    currency,
    interval,
    resolvePriceId
  );
  if (!priceId) {
    throw new AppError("Preço não configurado para este plano. Configure o priceId na Stripe primeiro.", 400);
  }

  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer =
    existing.data[0] ||
    (await stripe.customers.create({
      email,
      name: opts.customerName || undefined,
      metadata: { productKey }
    }));

  const company = await findCompanyByEmail(email);

  if (opts.sendInvoice) {
    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      collection_method: "send_invoice",
      days_until_due: 7,
      metadata: { productKey, vb_admin: "true" }
    });
    await processApprovedStripePayment({
      email,
      productKey,
      interval,
      providerSubscriptionId: sub.id,
      issueRegistrationToken: !company
    });
    return { subscriptionId: sub.id, customerId: customer.id, mode: "invoice" as const };
  }

  const session = await createCheckoutSession({
    productKey,
    currency,
    interval,
    email,
    companyId: company ? Number(company.id) : undefined
  });
  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    customerId: customer.id,
    mode: "checkout" as const
  };
}

export async function resolveProductKeyForPrice(priceId: string) {
  return resolveProductKeyFromAnyPriceId(priceId, resolveProductKeyFromPriceId);
}
