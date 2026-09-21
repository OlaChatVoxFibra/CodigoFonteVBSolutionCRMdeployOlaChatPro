/**
 * VB Solution CRM - Visao Business
 * Google OAuth (somente autenticacao / login).
 */
export function resolveGoogleOAuthRedirectUri(): string {
  const base = (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${(process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`).replace(
      /\/$/,
      ""
    )}/google/oauth/callback`
  ).trim();
  return base;
}

export function getGoogleOAuthClientConfig(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET nao configurados no servidor."
    );
  }
  return { clientId, clientSecret };
}