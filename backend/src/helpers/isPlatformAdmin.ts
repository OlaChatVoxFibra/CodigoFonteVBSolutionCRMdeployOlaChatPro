/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Admin plataforma VB — assinaturas globais, empresas, etc. */
export const PLATFORM_ADMIN_EMAILS = [
  "admin@admin",
  "admin@admin.com",
  "admin@local.dev"
] as const;

export function isPlatformAdminEmail(email?: string | null): boolean {
  const e = String(email || "").trim().toLowerCase();
  return (PLATFORM_ADMIN_EMAILS as readonly string[]).includes(e);
}
