/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../models/User";
import Company from "../models/Company";
import AppError from "../errors/AppError";
import { PLATFORM_DEFAULT_COMPANY_ID } from "../constants/platformCompany";
import { VISUAL_IDENTITY_EMAIL_ALLOWLIST } from "../constants/visualIdentity";
import { isFullOrgSettingsAdminEmail } from "../constants/fullOrgSettingsAdmin";
import { isPlatformAdminEmail } from "./isPlatformAdmin";
import { isWhiteLabelCompany } from "./isWhiteLabelCompany";
import { getCompanyAttributesForPublicThemeResolve } from "./companyOptionalColumns";

export function userCanAccessVisualIdentityUi(user: User, company: Company | null | undefined): boolean {
  const email = String(user.email || "").toLowerCase();
  if (user.super) return true;
  if (isPlatformAdminEmail(email)) return true;
  if (VISUAL_IDENTITY_EMAIL_ALLOWLIST.includes(email)) return true;
  if (isFullOrgSettingsAdminEmail(email)) return true;
  /** Visão Business (empresa 1): define o tema padrão da plataforma para as demais assinaturas. */
  if (
    company &&
    company.id === PLATFORM_DEFAULT_COMPANY_ID &&
    user.profile === "admin"
  ) {
    return true;
  }
  if (isWhiteLabelCompany(company)) return true;
  if (company && (company as any).allowOrgManualVisualIdentity) return true;
  return false;
}

export async function assertCanMutateVisualIdentitySettings(
  userId: number,
  companyId: number
): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  const companyAttrs = await getCompanyAttributesForPublicThemeResolve();
  const company = await Company.findByPk(companyId, {
    attributes: companyAttrs as any
  });
  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const email = String(user.email || "").toLowerCase();
  const privileged =
    !!user.super || isPlatformAdminEmail(email) || isFullOrgSettingsAdminEmail(email);
  const allowlisted = VISUAL_IDENTITY_EMAIL_ALLOWLIST.includes(email);
  const can =
    privileged ||
    allowlisted ||
    companyId === PLATFORM_DEFAULT_COMPANY_ID ||
    isWhiteLabelCompany(company) ||
    !!(company as any).allowOrgManualVisualIdentity;

  if (!can) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}
