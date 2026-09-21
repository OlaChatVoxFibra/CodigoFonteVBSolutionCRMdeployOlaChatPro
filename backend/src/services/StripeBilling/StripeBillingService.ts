/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Stripe from "stripe";
import Company from "../../models/Company";
import User from "../../models/User";
import Subscriptions from "../../models/Subscriptions";
import { SendMailSmart } from "../../helpers/SendMail";
import logger from "../../utils/logger";
import {
  checkoutBranding,
  cycleDays,
  getStripeClient,
  isBrainProduct,
  isCrmProduct,
  listPublicStripeCatalog,
  normalizeInterval,
  planLabelForProduct,
  resolvePaymentLink,
  resolvePriceId,
  resolveProductKeyFromPriceId,
  resolveCheckoutCancelUrl,
  CRM_ONBOARDING_ADDON,
  resolveOnboardingPriceId,
  stripeSuccessUrl,
  StripeInterval,
  StripeProductKey
} from "../../config/stripeBilling";
import {
  activateBrainAddonFromStripeProduct
} from "../AiBrainServices/BrainCreditService";
import { getPlanEntitlements, enrichCatalogProduct, enrichCatalogProductAsync, getMergedPlanEntitlements } from "../../config/stripePlanEntitlements";
import {
  resolveProductKeyFromAnyPriceId
} from "./stripePlanSettingsService";
import {
  issueToken,
  resolvePlanByName
} from "../../controllers/PaymentConfirmationController";

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

async function findCompanyByEmail(email: string) {
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

function recurrenceFromInterval(interval: StripeInterval): string {
  return interval === "annual" ? "anual" : "mensal";
}

async function resolvePriceIdFromStripeObject(
  stripe: Stripe,
  obj: Stripe.Checkout.Session | Stripe.Invoice | Stripe.Subscription
): Promise<string | null> {
  if ("line_items" in obj && obj.line_items?.data?.[0]?.price?.id) {
    return String(obj.line_items.data[0].price.id);
  }
  if ("items" in obj && (obj as Stripe.Subscription).items?.data?.[0]?.price?.id) {
    return String((obj as Stripe.Subscription).items.data[0].price.id);
  }
  if ("lines" in obj) {
    const line = (obj as Stripe.Invoice).lines?.data?.[0] as any;
    if (line?.price?.id) return String(line.price.id);
  }
  const sessionId = (obj as Stripe.Checkout.Session).id;
  if (sessionId && (obj as Stripe.Checkout.Session).object === "checkout.session") {
    const full = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items.data.price", "subscription"]
    });
    const fromLine = full.line_items?.data?.[0]?.price?.id;
    if (fromLine) return String(fromLine);
    const subId = full.subscription;
    if (typeof subId === "string") {
      const sub = await stripe.subscriptions.retrieve(subId);
      const pid = sub.items.data[0]?.price?.id;
      if (pid) return String(pid);
    }
  }
  const invoiceSub = (obj as any).subscription;
  const sessionSub = (obj as Stripe.Checkout.Session).subscription;
  const subId =
    typeof sessionSub === "string"
      ? sessionSub
      : typeof invoiceSub === "string"
      ? invoiceSub
      : null;
  if (subId) {
    const sub = await stripe.subscriptions.retrieve(subId);
    const pid = sub.items.data[0]?.price?.id;
    if (pid) return String(pid);
  }
  return null;
}

function extractEmailFromSession(session: Stripe.Checkout.Session): string {
  return (
    session.customer_details?.email ||
    session.customer_email ||
    ""
  ).trim();
}

async function extractEmailFromInvoice(
  stripe: Stripe,
  invoice: Stripe.Invoice
): Promise<string> {
  if (invoice.customer_email) return invoice.customer_email.trim();
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return "";
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted && "email" in customer && customer.email) {
      return customer.email.trim();
    }
  } catch {
    // ignore
  }
  return "";
}

export async function processApprovedStripePayment(opts: {
  email: string;
  productKey?: StripeProductKey | null;
  interval?: StripeInterval;
  providerSubscriptionId?: string | null;
  issueRegistrationToken?: boolean;
}) {
  const email = String(opts.email || "").trim();
  if (!email) return;

  const productKey = opts.productKey || null;
  const interval = opts.interval || "monthly";
  const planName = productKey ? planLabelForProduct(productKey) : undefined;
  const days = cycleDays(interval);
  const company = await findCompanyByEmail(email);

  if (company && productKey && isBrainProduct(productKey)) {
    await activateBrainAddonFromStripeProduct(company.id, productKey);
    const now = new Date();
    const base = company.dueDate ? new Date(company.dueDate) : now;
    const nextDue = addDays(base > now ? base : now, days);
    const nextDueStr = nextDue.toISOString().slice(0, 10);
    let sub = await Subscriptions.findOne({
      where: { companyId: company.id } as any
    });
    if (!sub) {
      sub = await Subscriptions.create({
        companyId: company.id,
        isActive: true,
        expiresAt: nextDue,
        providerSubscriptionId: opts.providerSubscriptionId || null
      } as any);
    } else {
      await sub.update({
        isActive: true,
        expiresAt: nextDue,
        providerSubscriptionId:
          opts.providerSubscriptionId || sub.providerSubscriptionId
      } as any);
    }
    const notifyTo = email || String(company.email || "").trim();
    if (notifyTo) {
      await SendMailSmart({
        to: notifyTo,
        subject: "Brain.AI — créditos liberados",
        text: `Seu plano Brain.AI foi ativado. Os créditos extras já estão disponíveis na sua conta até ${nextDueStr}.`
      });
    }
    logger.info({
      msg: "Stripe: Brain add-on ativado",
      companyId: company.id,
      email,
      productKey,
      nextDue: nextDueStr
    });
    return;
  }

  if (!company) {
    if (opts.issueRegistrationToken === false) return;
    const rec = await issueToken(email, undefined, planName);
    const link = `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/register?confirmToken=${rec.token}`;
    await SendMailSmart({
      to: email,
      subject: "Confirme seu acesso — VB Solution",
      text: `Seu pagamento foi reconhecido. Conclua seu cadastro e crie sua senha: ${link}`
    });
    logger.info({
      msg: "Stripe: token de registro emitido",
      email,
      productKey,
      interval
    });
    return;
  }

  const now = new Date();
  const base = company.dueDate ? new Date(company.dueDate) : now;
  const nextDue = addDays(base > now ? base : now, days);
  const nextDueStr = nextDue.toISOString().slice(0, 10);
  const paidRecurrence = recurrenceFromInterval(interval);

  if (planName && productKey && isCrmProduct(productKey)) {
    const plan = await resolvePlanByName(planName);
    if (plan && company.planId !== (plan as any).id) {
      await company.update({ planId: (plan as any).id } as any);
    }
  }

  await company.reload();
  const prevRec = String((company as any).recurrence || "");
  const patch: any = { dueDate: nextDueStr, status: true };
  if (prevRec === "freemium" || !prevRec) {
    patch.recurrence = paidRecurrence;
  } else {
    patch.recurrence = paidRecurrence;
  }
  await company.update(patch as any);
  await company.reload();

  let sub = await Subscriptions.findOne({
    where: { companyId: company.id } as any
  });
  if (!sub) {
    sub = await Subscriptions.create({
      companyId: company.id,
      isActive: true,
      expiresAt: nextDue,
      providerSubscriptionId: opts.providerSubscriptionId || null
    } as any);
  } else {
    await sub.update({
      isActive: true,
      expiresAt: nextDue,
      providerSubscriptionId:
        opts.providerSubscriptionId || sub.providerSubscriptionId
    } as any);
  }

  const tokenEmail = email || String(company.email || "").trim();
  const rec = await issueToken(
    tokenEmail,
    company.id,
    planName || (company as any).plan?.name
  );
  const link = `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/register?confirmToken=${rec.token}`;
  const adminUser = await User.findOne({
    where: { companyId: company.id } as any
  });
  const notifyTo = tokenEmail || company.email || "";
  if (adminUser) {
    await SendMailSmart({
      to: notifyTo,
      subject: "Pagamento aprovado — plano atualizado",
      text: `Seu pagamento Stripe foi aprovado. Plano liberado até ${nextDueStr}. Link de apoio: ${link}`
    });
  } else {
    await SendMailSmart({
      to: notifyTo,
      subject: "Confirme seu acesso — VB Solution",
      text: `Seu pagamento foi aprovado. Crie sua senha para acessar: ${link}`
    });
  }

  logger.info({
    msg: "Stripe: pagamento processado",
    companyId: company.id,
    email,
    productKey,
    nextDue: nextDueStr
  });
}

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const email = extractEmailFromSession(session);
  if (!email) {
    logger.warn({ msg: "Stripe checkout.session.completed sem e-mail", sessionId: session.id });
    return;
  }
  const priceId = await resolvePriceIdFromStripeObject(stripe, session);
  const productKey = priceId ? resolveProductKeyFromPriceId(priceId) : null;
  const interval: StripeInterval =
    session.mode === "subscription" && priceId
      ? normalizeInterval(
          (await stripe.prices.retrieve(priceId)).recurring?.interval === "year"
            ? "annual"
            : "monthly"
        )
      : "monthly";
  const subId =
    typeof session.subscription === "string" ? session.subscription : null;
  await processApprovedStripePayment({
    email,
    productKey,
    interval,
    providerSubscriptionId: subId,
    issueRegistrationToken: true
  });
}

async function handleInvoicePaid(stripe: Stripe, invoice: Stripe.Invoice) {
  if (invoice.billing_reason === "subscription_create") return;
  const email = await extractEmailFromInvoice(stripe, invoice);
  if (!email) return;
  const priceId = await resolvePriceIdFromStripeObject(stripe, invoice);
  const productKey = priceId ? resolveProductKeyFromPriceId(priceId) : null;
  const interval: StripeInterval = priceId
    ? normalizeInterval(
        (await stripe.prices.retrieve(priceId)).recurring?.interval === "year"
          ? "annual"
          : "monthly"
      )
    : "monthly";
  const subId =
    typeof (invoice as any).subscription === "string"
      ? (invoice as any).subscription
      : null;
  await processApprovedStripePayment({
    email,
    productKey,
    interval,
    providerSubscriptionId: subId,
    issueRegistrationToken: false
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;
  const stripe = await getStripeClient();
  if (!stripe) return;
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
  logger.info({ msg: "Stripe: assinatura cancelada", companyId: company.id, email });
}

async function handlePaymentFailed(stripe: Stripe, invoice: Stripe.Invoice) {
  const email = await extractEmailFromInvoice(stripe, invoice);
  logger.warn({ msg: "Stripe: falha no pagamento", email, invoiceId: invoice.id });
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(stripe, event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      if (sub.status !== "active" && sub.status !== "trialing") break;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (!customerId) break;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted || !("email" in customer) || !customer.email) break;
        const company = await findCompanyByEmail(customer.email.trim());
        if (!company) break;
        const priceId = await resolvePriceIdFromStripeObject(stripe, sub);
        const interval: StripeInterval = priceId
          ? normalizeInterval(
              (await stripe.prices.retrieve(priceId)).recurring?.interval ===
                "year"
                ? "annual"
                : "monthly"
            )
          : "monthly";
        const periodEndUnix = (sub as any).current_period_end as number | undefined;
        const periodEnd = periodEndUnix
          ? new Date(periodEndUnix * 1000)
          : addDays(new Date(), cycleDays(interval));
        await company.update({
          dueDate: periodEnd.toISOString().slice(0, 10),
          status: true,
          recurrence: recurrenceFromInterval(interval)
        } as any);
        const row = await Subscriptions.findOne({
          where: { companyId: company.id } as any
        });
        if (row) {
          await row.update({
            isActive: true,
            expiresAt: periodEnd,
            providerSubscriptionId: sub.id
          } as any);
        }
      } catch (e) {
        logger.error({
          msg: "Stripe subscription.updated error",
          error: (e as Error).message
        });
      }
      break;
    }
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await handleInvoicePaid(stripe, event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(stripe, event.data.object as Stripe.Invoice);
      break;
    default:
      break;
  }
}

export async function createCheckoutSession(opts: {
  productKey: string;
  currency?: string;
  interval?: string;
  email?: string;
  companyId?: number;
  cancelUrl?: string;
  includeOnboarding?: boolean;
}) {
  const stripe = await getStripeClient();
  if (!stripe) throw new Error("STRIPE_NOT_CONFIGURED");

  const productKey = opts.productKey as StripeProductKey;
  const currency = (opts.currency || "brl").toLowerCase();
  const interval = normalizeInterval(opts.interval);
  const priceId = resolvePriceId(productKey, currency, interval);
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_FOUND");

  const includeOnboarding = Boolean(
    opts.includeOnboarding && isCrmProduct(productKey) && !isBrainProduct(productKey)
  );

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: priceId, quantity: 1 }
  ];

  if (includeOnboarding) {
    const onboardingPriceId = resolveOnboardingPriceId(currency);
    if (onboardingPriceId) {
      lineItems.push({ price: onboardingPriceId, quantity: 1 });
    } else {
      lineItems.push({
        price_data: {
          currency: "brl",
          product_data: { name: CRM_ONBOARDING_ADDON.name },
          unit_amount: CRM_ONBOARDING_ADDON.amountCents
        },
        quantity: 1
      });
    }
  }

  const branding = checkoutBranding(productKey);
  const frontend = process.env.FRONTEND_URL?.replace(/\/$/, "") || "";
  const brainSuccess = `${frontend}/brain-ai?payment=success&session_id={CHECKOUT_SESSION_ID}&view=plans`;
  const cancelUrl = resolveCheckoutCancelUrl(productKey, { cancelUrl: opts.cancelUrl });

  const enableInstallments =
    includeOnboarding &&
    interval === "monthly" &&
    currency === "brl";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: lineItems,
    success_url: isBrainProduct(productKey) ? brainSuccess : stripeSuccessUrl(),
    cancel_url: cancelUrl,
    customer_email: opts.email || undefined,
    metadata: {
      productKey,
      currency,
      interval,
      companyId: opts.companyId ? String(opts.companyId) : "",
      includeOnboarding: includeOnboarding ? "true" : "false"
    },
    subscription_data: {
      metadata: {
        productKey,
        interval,
        includeOnboarding: includeOnboarding ? "true" : "false"
      }
    },
    payment_method_types: ["card"],
    allow_promotion_codes: true,
    ...(enableInstallments
      ? {
          payment_method_options: {
            card: {
              installments: {
                enabled: true
              }
            }
          }
        }
      : {}),
    ...( {
      branding_settings: {
        background_color: branding.background_color,
        button_color: branding.button_color
      }
    } as Record<string, unknown> )
  });

  return session;
}

export async function resolvePublicPayRedirect(opts: {
  productKey: string;
  currency?: string;
  interval?: string;
  email?: string;
  includeOnboarding?: boolean;
}) {
  const productKey = opts.productKey;
  const currency = (opts.currency || "brl").toLowerCase();
  const interval = normalizeInterval(opts.interval);
  const includeOnboarding = Boolean(opts.includeOnboarding);

  if (includeOnboarding && isCrmProduct(productKey)) {
    const session = await createCheckoutSession({
      productKey,
      currency,
      interval,
      email: opts.email,
      includeOnboarding: true
    });
    return session.url;
  }

  const paymentLink = resolvePaymentLink(productKey, currency, interval);
  if (paymentLink && !paymentLink.includes("/subscription/stripe/pay")) {
    if (opts.email?.trim()) {
      const join = paymentLink.includes("?") ? "&" : "?";
      return `${paymentLink}${join}prefilled_email=${encodeURIComponent(opts.email.trim())}`;
    }
    return paymentLink;
  }

  const session = await createCheckoutSession({
    productKey,
    currency,
    interval,
    email: opts.email
  });
  return session.url;
}

function formatInvoiceRow(invoice: Stripe.Invoice) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountDue: invoice.amount_due,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    created: invoice.created,
    dueDate: invoice.due_date,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf
  };
}

async function resolveStripeCustomerId(
  stripe: Stripe,
  emails: string[]
): Promise<string | null> {
  const seen = new Set<string>();
  for (const raw of emails) {
    const email = String(raw || "").trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    try {
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data[0]?.id) return list.data[0].id;
    } catch {
      // ignore lookup errors
    }
  }
  return null;
}

export async function fetchStripeCustomerSnapshot(opts: {
  emails: string[];
  providerSubscriptionId?: string | null;
}) {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { configured: false as const };
  }

  let customerId = await resolveStripeCustomerId(stripe, opts.emails);
  let activeSubscription: Stripe.Subscription | null = null;

  if (!customerId && opts.providerSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(opts.providerSubscriptionId);
      customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null;
      if (sub.status === "active" || sub.status === "trialing") {
        activeSubscription = sub;
      }
    } catch {
      // ignore
    }
  }

  if (!customerId) {
    return { configured: true as const, customerId: null };
  }

  if (!activeSubscription) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 5
      });
      activeSubscription =
        subs.data.find(s => s.status === "active" || s.status === "trialing") ||
        subs.data[0] ||
        null;
    } catch {
      activeSubscription = null;
    }
  }

  let pendingInvoices: ReturnType<typeof formatInvoiceRow>[] = [];
  let paidInvoices: ReturnType<typeof formatInvoiceRow>[] = [];
  let upcomingInvoice: {
    amountDue: number;
    currency: string;
    periodEnd: number | null;
  } | null = null;
  let balance = 0;
  let customerEmail: string | null = null;

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      const activeCustomer = customer as Stripe.Customer;
      balance = activeCustomer.balance || 0;
      customerEmail = activeCustomer.email || null;
    }
  } catch {
    // ignore
  }

  try {
    const open = await stripe.invoices.list({
      customer: customerId,
      status: "open",
      limit: 10
    });
    pendingInvoices = open.data.map(formatInvoiceRow);
  } catch {
    pendingInvoices = [];
  }

  try {
    const paid = await stripe.invoices.list({
      customer: customerId,
      status: "paid",
      limit: 12
    });
    paidInvoices = paid.data.map(formatInvoiceRow);
  } catch {
    paidInvoices = [];
  }

  try {
    const retrieveUpcoming = (stripe.invoices as any).retrieveUpcoming;
    if (typeof retrieveUpcoming === "function") {
      const upcoming = await retrieveUpcoming.call(stripe.invoices, {
        customer: customerId
      });
      upcomingInvoice = {
        amountDue: upcoming.amount_due,
        currency: upcoming.currency || "brl",
        periodEnd: (upcoming as any).period_end || null
      };
    }
  } catch {
    upcomingInvoice = null;
  }

  let stripeProductKey: StripeProductKey | null = null;
  let stripeInterval: StripeInterval | null = null;
  let stripePlanLabel: string | null = null;
  if (activeSubscription?.items?.data?.[0]?.price?.id) {
    const priceId = String(activeSubscription.items.data[0].price.id);
    stripeProductKey = resolveProductKeyFromPriceId(priceId);
    try {
      const price = await stripe.prices.retrieve(priceId);
      stripeInterval = normalizeInterval(
        price.recurring?.interval === "year" ? "annual" : "monthly"
      );
    } catch {
      stripeInterval = null;
    }
    if (stripeProductKey) stripePlanLabel = planLabelForProduct(stripeProductKey);
  }

  return {
    configured: true as const,
    customerId,
    customerEmail,
    balance,
    subscription: activeSubscription
      ? {
          id: activeSubscription.id,
          status: activeSubscription.status,
          currentPeriodEnd: (activeSubscription as any).current_period_end || null,
          cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
          productKey: stripeProductKey,
          planLabel: stripePlanLabel,
          interval: stripeInterval
        }
      : null,
    pendingInvoices,
    paidInvoices,
    upcomingInvoice
  };
}

export async function getCompanyStripeStatus(companyId: number) {
  const company = await Company.findByPk(companyId, {
    include: ["plan"]
  });
  if (!company) return null;
  const sub = await Subscriptions.findOne({
    where: { companyId } as any
  });

  const adminUsers = await User.findAll({
    where: { companyId } as any,
    attributes: ["email"]
  });
  const emails = [
    String(company.email || "").trim(),
    ...adminUsers.map(u => String(u.email || "").trim())
  ].filter(Boolean);

  const stripeSnapshot = await fetchStripeCustomerSnapshot({
    emails,
    providerSubscriptionId: sub?.providerSubscriptionId || null
  });

  const availablePlans = await listPublicStripeCatalog({ type: "crm" });

  return {
    companyId: company.id,
    dueDate: company.dueDate,
    recurrence: company.recurrence,
    status: company.status,
    plan: (company as any).plan,
    subscription: sub
      ? {
          isActive: sub.isActive,
          expiresAt: sub.expiresAt,
          providerSubscriptionId: sub.providerSubscriptionId
        }
      : null,
    stripe: stripeSnapshot,
    availablePlans
  };
}

export type PlatformStripeSubscriptionRow = {
  subscriptionId: string;
  status: string;
  customerId: string | null;
  customerEmail: string | null;
  customerName: string | null;
  companyId: number | null;
  companyName: string | null;
  productKey: string | null;
  planLabel: string | null;
  productType: "crm" | "brain" | null;
  interval: StripeInterval | null;
  amountCents: number | null;
  currency: string | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  created: number;
  entitlements: ReturnType<typeof getPlanEntitlements>;
  localDueDate: string | null;
  localSubscriptionActive: boolean | null;
  providerSubscriptionId: string | null;
  pendingInvoices: ReturnType<typeof formatInvoiceRow>[];
  paidInvoices: ReturnType<typeof formatInvoiceRow>[];
  upcomingInvoice: {
    amountDue: number;
    currency: string;
    periodEnd: number | null;
  } | null;
};

function formatSubscriptionAmount(sub: Stripe.Subscription): {
  amountCents: number | null;
  currency: string | null;
} {
  const item = sub.items?.data?.[0];
  const unit = item?.price?.unit_amount;
  const qty = item?.quantity || 1;
  return {
    amountCents: typeof unit === "number" ? unit * qty : null,
    currency: item?.price?.currency || null
  };
}

export async function listEnrichedStripeCatalog(opts?: {
  type?: "crm" | "brain" | "all";
}) {
  const products = await listPublicStripeCatalog(opts);
  return Promise.all(products.map(enrichCatalogProductAsync));
}

export async function listPlatformStripeSubscriptions(opts?: {
  limit?: number;
  status?: Stripe.Subscription.Status | "all" | "active_only";
}): Promise<{
  configured: boolean;
  subscriptions: PlatformStripeSubscriptionRow[];
  hasMore: boolean;
}> {
  const stripe = await getStripeClient();
  if (!stripe) {
    return { configured: false, subscriptions: [], hasMore: false };
  }

  const limit = Math.min(Math.max(Number(opts?.limit) || 100, 1), 100);
  const statusFilter = opts?.status || "active_only";

  const listParams: Stripe.SubscriptionListParams = {
    limit,
    expand: ["data.customer", "data.items.data.price"]
  };
  if (statusFilter !== "all" && statusFilter !== "active_only") {
    listParams.status = statusFilter;
  }

  const page = await stripe.subscriptions.list(listParams);

  let rows = page.data;
  if (statusFilter === "active_only") {
    rows = rows.filter(s => s.status === "active" || s.status === "trialing");
  }

  const companies = await Company.findAll({
    attributes: ["id", "name", "email", "dueDate"],
    include: [{ association: "plan", attributes: ["id", "name"] }]
  });
  const emailToCompany = new Map<string, Company>();
  for (const company of companies) {
    const email = String(company.email || "").trim().toLowerCase();
    if (email) emailToCompany.set(email, company);
  }

  const adminUsers = await User.findAll({
    attributes: ["email", "companyId"]
  });
  const userEmailToCompanyId = new Map<string, number>();
  for (const u of adminUsers) {
    const email = String(u.email || "").trim().toLowerCase();
    if (email && u.companyId) userEmailToCompanyId.set(email, Number(u.companyId));
  }
  const companyById = new Map(companies.map(c => [Number(c.id), c]));

  const companyIds = companies.map(c => Number(c.id)).filter(Boolean);
  const localSubs = companyIds.length
    ? await Subscriptions.findAll({ where: { companyId: companyIds } as any })
    : [];
  const localSubByCompany = new Map(
    localSubs.map(s => [Number(s.companyId), s])
  );

  const invoiceCache = new Map<
    string,
    {
      pending: ReturnType<typeof formatInvoiceRow>[];
      paid: ReturnType<typeof formatInvoiceRow>[];
      upcoming: PlatformStripeSubscriptionRow["upcomingInvoice"];
    }
  >();

  async function loadCustomerBilling(customerId: string) {
    if (invoiceCache.has(customerId)) return invoiceCache.get(customerId)!;
    let pending: ReturnType<typeof formatInvoiceRow>[] = [];
    let paid: ReturnType<typeof formatInvoiceRow>[] = [];
    let upcoming: PlatformStripeSubscriptionRow["upcomingInvoice"] = null;
    try {
      const open = await stripe!.invoices.list({
        customer: customerId,
        status: "open",
        limit: 8
      });
      pending = open.data.map(formatInvoiceRow);
    } catch {
      pending = [];
    }
    try {
      const paidList = await stripe!.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 8
      });
      paid = paidList.data.map(formatInvoiceRow);
    } catch {
      paid = [];
    }
    try {
      const retrieveUpcoming = (stripe!.invoices as any).retrieveUpcoming;
      if (typeof retrieveUpcoming === "function") {
        const up = await retrieveUpcoming.call(stripe!.invoices, { customer: customerId });
        upcoming = {
          amountDue: up.amount_due,
          currency: up.currency || "brl",
          periodEnd: (up as any).period_end || null
        };
      }
    } catch {
      upcoming = null;
    }
    const out = { pending, paid, upcoming };
    invoiceCache.set(customerId, out);
    return out;
  }

  const subscriptions: PlatformStripeSubscriptionRow[] = await Promise.all(
    rows.map(async sub => {
    const customer = sub.customer as Stripe.Customer | string | null;
    const customerObj =
      customer && typeof customer === "object" && !("deleted" in customer)
        ? (customer as Stripe.Customer)
        : null;
    const customerEmail = customerObj?.email?.trim().toLowerCase() || null;
    const customerId =
      typeof customer === "string" ? customer : customerObj?.id || null;

    let company: Company | null = null;
    if (customerEmail) {
      company = emailToCompany.get(customerEmail) || null;
      if (!company) {
        const cid = userEmailToCompanyId.get(customerEmail);
        if (cid) company = companyById.get(cid) || null;
      }
    }

    const priceId = sub.items?.data?.[0]?.price?.id;
    const productKey = priceId
      ? await resolveProductKeyFromAnyPriceId(priceId, resolveProductKeyFromPriceId)
      : null;
    let interval: StripeInterval | null = null;
    const recurring = sub.items?.data?.[0]?.price?.recurring;
    if (recurring?.interval) {
      interval = normalizeInterval(
        recurring.interval === "year" ? "annual" : "monthly"
      );
    }
    const { amountCents, currency } = formatSubscriptionAmount(sub);
    const localSub = company ? localSubByCompany.get(Number(company.id)) : null;
    const billing = customerId ? await loadCustomerBilling(customerId) : null;

    return {
      subscriptionId: sub.id,
      status: sub.status,
      customerId,
      customerEmail: customerObj?.email || null,
      customerName: customerObj?.name || null,
      companyId: company ? Number(company.id) : null,
      companyName: company?.name || null,
      productKey,
      planLabel: productKey ? planLabelForProduct(productKey) : null,
      productType: productKey
        ? isBrainProduct(productKey)
          ? "brain"
          : isCrmProduct(productKey)
          ? "crm"
          : null
        : null,
      interval,
      amountCents,
      currency,
      currentPeriodStart: (sub as any).current_period_start || null,
      currentPeriodEnd: (sub as any).current_period_end || null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      created: sub.created,
      entitlements: productKey ? await getMergedPlanEntitlements(productKey) : null,
      localDueDate: company?.dueDate
        ? String(company.dueDate).slice(0, 10)
        : null,
      localSubscriptionActive: localSub ? Boolean(localSub.isActive) : null,
      providerSubscriptionId: localSub?.providerSubscriptionId || sub.id,
      pendingInvoices: billing?.pending || [],
      paidInvoices: billing?.paid || [],
      upcomingInvoice: billing?.upcoming || null
    };
    })
  );

  return {
    configured: true,
    subscriptions,
    hasMore: page.has_more
  };
}
