/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Contas admin de organização dedicada — mesma UI de Configurações que admin@admin.com, dados só da própria org. */
export const FULL_ORG_SETTINGS_ADMIN_EMAILS = [
  "gestaovendas@gmail.com",
  "admin@local.dev"
] as const;

export function isFullOrgSettingsAdminEmail(email?: string | null): boolean {
  const e = String(email || "").trim().toLowerCase();
  return (FULL_ORG_SETTINGS_ADMIN_EMAILS as readonly string[]).includes(e);
}
