/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const STRIPE_RETURN_STORAGE_KEY = "vb_stripe_checkout_return";

/** Caminho relativo atual (pathname + search + hash) para retorno pós-checkout. */
export function getStripeCheckoutReturnPath() {
  if (typeof window === "undefined") return "/brain-ai";
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return path && path.startsWith("/") ? path : "/brain-ai";
}

export function saveStripeCheckoutReturnPath(path) {
  if (typeof window === "undefined") return;
  const safe = path && String(path).startsWith("/") && !String(path).startsWith("//")
    ? path
    : "/brain-ai";
  try {
    window.sessionStorage.setItem(STRIPE_RETURN_STORAGE_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function readStripeCheckoutReturnPath() {
  if (typeof window === "undefined") return "/brain-ai";
  try {
    const stored = window.sessionStorage.getItem(STRIPE_RETURN_STORAGE_KEY);
    if (stored && stored.startsWith("/") && !stored.startsWith("//")) return stored;
  } catch {
    /* ignore */
  }
  return "/brain-ai";
}

export function clearStripeCheckoutReturnPath() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STRIPE_RETURN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** URL interna de cancelamento com rota de retorno codificada. */
export function buildStripeCancelPageUrl(returnPath) {
  if (typeof window === "undefined") return "/payment/cancel";
  const safe = returnPath && String(returnPath).startsWith("/") && !String(returnPath).startsWith("//")
    ? returnPath
    : getStripeCheckoutReturnPath();
  return `${window.location.origin}/payment/cancel?return=${encodeURIComponent(safe)}`;
}

/** Valida path relativo seguro (sem open redirect). */
export function sanitizeStripeReturnPath(raw) {
  if (!raw || typeof raw !== "string") return null;
  const decoded = decodeURIComponent(raw.trim());
  if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
  return decoded;
}
