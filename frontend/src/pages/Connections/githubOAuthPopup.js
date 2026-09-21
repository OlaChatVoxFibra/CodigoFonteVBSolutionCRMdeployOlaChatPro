/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Abre popup OAuth GitHub via página branded do VBSolution (evita erros DNS crus no popup).
 */
export function openGithubOAuthPopup({ mode = "org" } = {}) {
  const params = new URLSearchParams({ mode });
  const path = `/connections/github/oauth/start?${params.toString()}`;

  const w = 480;
  const h = 640;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);

  const popup = window.open(
    path,
    mode === "org" ? "vbsolution_github_org_oauth" : "vbsolution_github_user_oauth",
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
  );

  if (!popup) {
    return { ok: false, reason: "blocked" };
  }

  return { ok: true, popup };
}

export function subscribeGithubOAuthCallback(handler) {
  const listener = (event) => {
    if (event.origin !== window.location.origin) return;
    const payload = event.data;
    if (!payload || payload.type !== "github-oauth-callback") return;
    handler(payload);
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
