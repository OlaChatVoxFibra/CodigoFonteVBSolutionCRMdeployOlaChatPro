/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PLATFORM_DEFAULT_COMPANY_ID } from "../constants/platformCompany";
import { VISUAL_IDENTITY_EMAIL_ALLOWLIST } from "../constants/visualIdentity";
import {
  isFullOrgSettingsAdmin,
  isPlatformAdminEmail,
} from "../constants/fullOrgSettingsAdmin";

/** Conta administrativa da plataforma (texto explicativo longo da Identidade Visual só para ela / org 1). */
export function isPlatformWhitelabelIntroAccount(user) {
  if (!user) return false;
  if (isPlatformAdminEmail(user.email)) return true;
  return Number(user.companyId) === PLATFORM_DEFAULT_COMPANY_ID;
}

/** Só estas contas editam o nome da aplicação na Identidade Visual. */
export function isWhitelabelAppNameEditor(user) {
  if (!user) return false;
  return isPlatformAdminEmail(user.email);
}

/** Cor do texto dos botões principais na Identidade Visual: empresas tenant (não organização 1). */
export function isTenantVisualIdentityCompany(user) {
  if (!user) return false;
  return Number(user.companyId) !== PLATFORM_DEFAULT_COMPANY_ID;
}

/**
 * Quem pode ver/editar a aba Identidade Visual (alinhado ao backend + fallback de sessão antiga).
 */
export function canAccessVisualIdentityUi(user) {
  if (!user || !user.id) return false;
  if (user.super) return true;
  if (isPlatformAdminEmail(user.email)) return true;
  const email = String(user.email || "").toLowerCase();
  if (VISUAL_IDENTITY_EMAIL_ALLOWLIST.includes(email)) return true;
  if (isFullOrgSettingsAdmin(user)) return true;
  if (Boolean(user.canAccessVisualIdentitySettings)) return true;
  if (Boolean(user.isWhiteLabelCustomer)) return true;
  if (Boolean(user.allowOrgManualVisualIdentity)) return true;
  if (
    Number(user.companyId) === PLATFORM_DEFAULT_COMPANY_ID &&
    user.profile === "admin"
  ) {
    return true;
  }
  return false;
}
