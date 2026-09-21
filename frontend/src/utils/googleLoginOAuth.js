/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function openGoogleLoginPopup() {
  const path = "/login/google/oauth/start";
  const w = 520;
  const h = 680;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
  const popup = window.open(
    path,
    "vbsolution_google_login_oauth",
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );
  if (!popup) return { ok: false, reason: "blocked" };
  return { ok: true, popup };
}

export function subscribeGoogleLoginCallback(handler) {
  const allowedOrigins = new Set([
    window.location.origin,
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://vbsolution.com.br",
    "https://www.vbsolution.com.br",
    "https://vbsolution.vercel.app"
  ]);

  const listener = (event) => {
    if (!allowedOrigins.has(event.origin)) return;
    const payload = event.data;
    if (!payload || payload.type !== "google-login-oauth-callback") return;
    handler(payload);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
