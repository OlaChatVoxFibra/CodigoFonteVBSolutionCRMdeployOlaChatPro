/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";
import type { PlanEntitlements } from "../../config/stripePlanEntitlements";
import type { StripeCurrency, StripeInterval, StripeProductKey } from "../../config/stripeBilling";

const ENTITLEMENTS_KEY = "stripe_plan_entitlements_overrides";
const PRICES_KEY = "stripe_price_id_overrides";
const PLATFORM_COMPANY_ID = 1;

export type PriceOverridesMap = Partial<
  Record<
    StripeProductKey,
    Partial<Record<StripeCurrency, Partial<Record<StripeInterval, string>>>>
  >
>;

export type EntitlementsOverridesMap = Partial<
  Record<StripeProductKey, Partial<PlanEntitlements>>
>;

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await Setting.findOne({
      where: { companyId: PLATFORM_COMPANY_ID, key }
    });
    if (!row?.value) return fallback;
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonSetting(key: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value);
  const [row] = await Setting.findOrCreate({
    where: { companyId: PLATFORM_COMPANY_ID, key },
    defaults: { companyId: PLATFORM_COMPANY_ID, key, value: payload }
  });
  await row.update({ value: payload });
}

export async function getPriceOverrides(): Promise<PriceOverridesMap> {
  return readJsonSetting<PriceOverridesMap>(PRICES_KEY, {});
}

export async function getEntitlementsOverrides(): Promise<EntitlementsOverridesMap> {
  return readJsonSetting<EntitlementsOverridesMap>(ENTITLEMENTS_KEY, {});
}

export async function savePriceOverride(
  productKey: StripeProductKey,
  currency: StripeCurrency,
  interval: StripeInterval,
  priceId: string
): Promise<void> {
  const map = await getPriceOverrides();
  if (!map[productKey]) map[productKey] = {};
  if (!map[productKey]![currency]) map[productKey]![currency] = {};
  map[productKey]![currency]![interval] = priceId;
  await writeJsonSetting(PRICES_KEY, map);
}

export async function saveEntitlementsOverride(
  productKey: StripeProductKey,
  patch: Partial<PlanEntitlements>
): Promise<EntitlementsOverridesMap> {
  const map = await getEntitlementsOverrides();
  map[productKey] = { ...(map[productKey] || {}), ...patch };
  await writeJsonSetting(ENTITLEMENTS_KEY, map);
  return map;
}

export async function resolveEffectivePriceId(
  productKey: string,
  currency: string,
  interval: string,
  envResolver: (key: string, cur: string, intv: string) => string | null
): Promise<string | null> {
  const key = productKey as StripeProductKey;
  const cur = (currency || "brl").toLowerCase() as StripeCurrency;
  const intv = (interval || "monthly").toLowerCase() === "annual" ? "annual" : "monthly";
  const overrides = await getPriceOverrides();
  const fromDb = overrides[key]?.[cur]?.[intv];
  if (fromDb) return fromDb;
  return envResolver(key, cur, intv);
}

export async function resolveProductKeyFromAnyPriceId(
  priceId: string,
  envResolver: (id: string) => StripeProductKey | null
): Promise<StripeProductKey | null> {
  if (!priceId) return null;
  const overrides = await getPriceOverrides();
  for (const [productKey, byCurrency] of Object.entries(overrides)) {
    for (const byInterval of Object.values(byCurrency || {})) {
      for (const id of Object.values(byInterval || {})) {
        if (id === priceId) return productKey as StripeProductKey;
      }
    }
  }
  return envResolver(priceId);
}
