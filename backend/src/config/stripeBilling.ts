/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Stripe from "stripe";
import Setting from "../models/Setting";

export type StripeProductKey =
  | "starter"
  | "essencial"
  | "pro"
  | "brain_lite"
  | "brain_growth"
  | "brain_scale";

export type StripeInterval = "monthly" | "annual";
export type StripeCurrency = "brl" | "usd";

const PRODUCT_ENV_PREFIX: Record<StripeProductKey, string> = {
  starter: "STARTER",
  essencial: "ESSENCIAL",
  pro: "PRO",
  brain_lite: "BRAIN_LITE",
  brain_growth: "BRAIN_GROWTH",
  brain_scale: "BRAIN_SCALE"
};

const PLAN_LABELS: Record<StripeProductKey, string> = {
  starter: "Starter",
  essencial: "Essencial",
  pro: "Pro",
  brain_lite: "Brain.IA Lite",
  brain_growth: "Brain.IA Growth",
  brain_scale: "Brain.IA Scale"
};

const CRM_KEYS = new Set<StripeProductKey>(["starter", "essencial", "pro"]);
const BRAIN_KEYS = new Set<StripeProductKey>([
  "brain_lite",
  "brain_growth",
  "brain_scale"
]);

export function isCrmProduct(key: string): boolean {
  return CRM_KEYS.has(key as StripeProductKey);
}

export function isBrainProduct(key: string): boolean {
  return BRAIN_KEYS.has(key as StripeProductKey);
}

export function planLabelForProduct(key: string): string {
  return PLAN_LABELS[key as StripeProductKey] || key;
}

function priceEnvName(
  productKey: StripeProductKey,
  currency: StripeCurrency,
  interval: StripeInterval
): string {
  const prefix = PRODUCT_ENV_PREFIX[productKey];
  const cur = currency.toUpperCase();
  const intv = interval === "monthly" ? "MONTHLY" : "ANNUAL";
  return `STRIPE_PRICE_${prefix}_${cur}_${intv}`;
}

function paymentLinkEnvName(
  productKey: StripeProductKey,
  currency: StripeCurrency,
  interval: StripeInterval
): string {
  const prefix = PRODUCT_ENV_PREFIX[productKey];
  const cur = currency.toUpperCase();
  const intv = interval === "monthly" ? "MONTHLY" : "ANNUAL";
  return `PAYMENT_LINK_${prefix}_${cur}_${intv}`;
}

export function resolvePriceId(
  productKey: string,
  currency: string,
  interval: string
): string | null {
  const key = productKey as StripeProductKey;
  if (!PRODUCT_ENV_PREFIX[key]) return null;
  const envName = priceEnvName(
    key,
    (currency || "brl").toLowerCase() as StripeCurrency,
    (interval || "monthly").toLowerCase() === "annual" ? "annual" : "monthly"
  );
  return process.env[envName] || null;
}

export function resolveOnboardingPriceId(currency = "brl"): string | null {
  const cur = String(currency || "brl").toLowerCase();
  if (cur === "usd") {
    return process.env.STRIPE_PRICE_ONBOARDING_USD?.trim() || null;
  }
  return process.env.STRIPE_PRICE_ONBOARDING_BRL?.trim() || null;
}

export const CRM_ONBOARDING_ADDON = {
  productId: "",
  name: "Treinamento + Implantação",
  description:
    "Treinamentos ao vivo + implantação do sistema + acompanhamento via suporte.",
  amountCents: 0,
  maxInstallments: 12
};

export function resolvePaymentLink(
  productKey: string,
  currency: string,
  interval: string
): string | null {
  const key = productKey as StripeProductKey;
  if (!PRODUCT_ENV_PREFIX[key]) return null;
  const envName = paymentLinkEnvName(
    key,
    (currency || "brl").toLowerCase() as StripeCurrency,
    (interval || "monthly").toLowerCase() === "annual" ? "annual" : "monthly"
  );
  return process.env[envName] || null;
}

export function resolveProductKeyFromPriceId(priceId: string): StripeProductKey | null {
  if (!priceId) return null;
  const keys = Object.keys(PRODUCT_ENV_PREFIX) as StripeProductKey[];
  for (const productKey of keys) {
    for (const currency of ["brl", "usd"] as StripeCurrency[]) {
      for (const interval of ["monthly", "annual"] as StripeInterval[]) {
        if (resolvePriceId(productKey, currency, interval) === priceId) {
          return productKey;
        }
      }
    }
  }
  return null;
}

export async function getStripeSecretKey(): Promise<string | null> {
  const fromEnv = process.env.STRIPE_PRIVATE?.trim();
  if (fromEnv) return fromEnv;
  try {
    const row = await Setting.findOne({
      where: { companyId: 1, key: "stripeprivatekey" }
    });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function getStripeClient(): Promise<Stripe | null> {
  const key = await getStripeSecretKey();
  if (!key) return null;
  return new Stripe(key);
}

export function stripeSuccessUrl(sessionId?: string): string {
  const base = (
    process.env.STRIPE_OK_URL ||
    `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/payment/success`
  ).replace(/\/$/, "");
  if (!sessionId) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}session_id={CHECKOUT_SESSION_ID}`;
}

export function stripeCancelUrl(returnPath?: string): string {
  const base = process.env.FRONTEND_URL?.replace(/\/$/, "") || "";
  if (returnPath && isAllowedFrontendPath(returnPath)) {
    return `${base}/payment/cancel?return=${encodeURIComponent(returnPath)}`;
  }
  return (
    process.env.STRIPE_CANCEL_URL ||
    `${base}/payment/cancel`
  );
}

/** Aceita path relativo (/brain-ai?view=plans) ou URL absoluta do FRONTEND_URL. */
export function isAllowedFrontendPath(pathOrUrl: string): boolean {
  const frontend = process.env.FRONTEND_URL?.replace(/\/$/, "");
  if (!frontend || !pathOrUrl) return false;
  try {
    if (pathOrUrl.startsWith("/") && !pathOrUrl.startsWith("//")) {
      return true;
    }
    const u = new URL(pathOrUrl);
    const base = new URL(frontend);
    return u.origin === base.origin && u.pathname.startsWith("/");
  } catch {
    return false;
  }
}

export function resolveCheckoutCancelUrl(
  productKey: string,
  opts?: { cancelUrl?: string; returnPath?: string }
): string {
  if (opts?.cancelUrl && isAllowedFrontendPath(opts.cancelUrl)) {
    if (opts.cancelUrl.startsWith("/")) {
      const base = process.env.FRONTEND_URL?.replace(/\/$/, "") || "";
      return `${base}${opts.cancelUrl}`;
    }
    return opts.cancelUrl;
  }
  if (opts?.returnPath && isAllowedFrontendPath(opts.returnPath)) {
    return stripeCancelUrl(opts.returnPath);
  }
  if (isBrainProduct(productKey)) {
    return stripeCancelUrl("/brain-ai?view=plans");
  }
  return stripeCancelUrl();
}

export function checkoutBranding(productKey: string): {
  background_color: string;
  button_color: string;
} {
  if (isBrainProduct(productKey)) {
    return { background_color: "#14081F", button_color: "#6D28D9" };
  }
  return { background_color: "#010B1F", button_color: "#0B2A7E" };
}

export type CatalogPriceRow = {
  currency: StripeCurrency;
  interval: StripeInterval;
  priceId: string | null;
  paymentLink: string | null;
  unitAmount?: number | null;
  formattedAmount?: string | null;
};

export type CatalogProduct = {
  key: StripeProductKey;
  name: string;
  type: "brain" | "crm";
  prices: CatalogPriceRow[];
};

function mapCatalogProduct(productKey: StripeProductKey): CatalogProduct {
  return {
    key: productKey,
    name: PLAN_LABELS[productKey],
    type: isBrainProduct(productKey) ? "brain" : "crm",
    prices: (["brl", "usd"] as StripeCurrency[]).flatMap(currency =>
      (["monthly", "annual"] as StripeInterval[]).map(interval => ({
        currency,
        interval,
        priceId: resolvePriceId(productKey, currency, interval),
        paymentLink: resolvePaymentLink(productKey, currency, interval)
      }))
    )
  };
}

export function listCatalogProducts(): CatalogProduct[] {
  const keys = Object.keys(PRODUCT_ENV_PREFIX) as StripeProductKey[];
  return keys.map(mapCatalogProduct);
}

/** Todos os produtos do catálogo (admin), mesmo sem priceId configurado. */
export function listAllCatalogProducts(opts?: {
  type?: "crm" | "brain" | "all";
}): CatalogProduct[] {
  const type = opts?.type || "all";
  return listCatalogProducts().filter(product => {
    if (type === "crm" && !isCrmProduct(product.key)) return false;
    if (type === "brain" && !isBrainProduct(product.key)) return false;
    return true;
  });
}

async function mapCatalogWithEffectivePrices(
  product: CatalogProduct
): Promise<CatalogProduct> {
  const { resolveEffectivePriceId } = await import(
    "../services/StripeBilling/stripePlanSettingsService"
  );
  const prices = await Promise.all(
    product.prices.map(async row => {
      const priceId = await resolveEffectivePriceId(
        product.key,
        row.currency,
        row.interval,
        resolvePriceId
      );
      return {
        ...row,
        priceId: priceId || row.priceId,
        paymentLink: row.paymentLink
      };
    })
  );
  return { ...product, prices };
}

export async function listAdminStripeCatalog(opts?: {
  type?: "crm" | "brain" | "all";
}): Promise<CatalogProduct[]> {
  const products = listAllCatalogProducts(opts);
  const withPrices = await Promise.all(products.map(mapCatalogWithEffectivePrices));
  return enrichCatalogWithStripePrices(withPrices);
}

/** Produto com ao menos um priceId ou payment link configurado (BRL). */
export function isProductConfiguredInStripe(product: CatalogProduct): boolean {
  return product.prices.some(
    row =>
      row.currency === "brl" && (Boolean(row.priceId) || Boolean(row.paymentLink))
  );
}

export function listConfiguredCatalogProducts(opts?: {
  type?: "crm" | "brain" | "all";
}): CatalogProduct[] {
  const type = opts?.type || "all";
  return listCatalogProducts().filter(product => {
    if (type === "crm" && !isCrmProduct(product.key)) return false;
    if (type === "brain" && !isBrainProduct(product.key)) return false;
    return isProductConfiguredInStripe(product);
  });
}

function formatStripeUnitAmount(amount: number, currency: string): string {
  const value = amount / 100;
  if (currency.toLowerCase() === "brl") {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${currency.toUpperCase()} ${value.toFixed(2)}`;
}

export async function enrichCatalogWithStripePrices(
  products: CatalogProduct[]
): Promise<CatalogProduct[]> {
  const stripe = await getStripeClient();
  if (!stripe) return products;

  const enriched = await Promise.all(
    products.map(async product => {
      const prices = await Promise.all(
        product.prices.map(async row => {
          if (!row.priceId) return row;
          try {
            const price = await stripe.prices.retrieve(row.priceId);
            const unitAmount =
              typeof price.unit_amount === "number" ? price.unit_amount : null;
            return {
              ...row,
              unitAmount,
              formattedAmount:
                unitAmount != null
                  ? formatStripeUnitAmount(unitAmount, row.currency)
                  : null
            };
          } catch {
            return row;
          }
        })
      );
      return { ...product, prices };
    })
  );
  return enriched;
}

export async function listPublicStripeCatalog(opts?: {
  type?: "crm" | "brain" | "all";
}): Promise<CatalogProduct[]> {
  const configured = listConfiguredCatalogProducts(opts);
  return enrichCatalogWithStripePrices(configured);
}

export function normalizeInterval(raw?: string): StripeInterval {
  const v = String(raw || "").toLowerCase();
  if (v === "annual" || v === "anual" || v === "year" || v === "yearly") {
    return "annual";
  }
  return "monthly";
}

export function cycleDays(interval: StripeInterval): number {
  return interval === "annual" ? 365 : 30;
}
