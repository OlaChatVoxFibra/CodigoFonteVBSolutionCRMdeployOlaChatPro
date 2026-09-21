/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";
import Company from "../../models/Company";
import { PLATFORM_DEFAULT_COMPANY_ID } from "../../constants/platformCompany";
import { PUBLIC_THEME_SETTING_KEYS } from "../../constants/visualIdentity";
import { isWhiteLabelCompany } from "../../helpers/isWhiteLabelCompany";
import { getCompanyAttributesForPublicThemeResolve } from "../../helpers/companyOptionalColumns";

interface Request {
  key: string;
  companyId?: number;
}

async function resolveEffectiveCompanyIdForPublicTheme(
  requestedCompanyId?: number
): Promise<number> {
  if (
    requestedCompanyId === undefined ||
    requestedCompanyId === null ||
    Number.isNaN(Number(requestedCompanyId))
  ) {
    return PLATFORM_DEFAULT_COMPANY_ID;
  }
  const cid = Number(requestedCompanyId);
  if (cid === PLATFORM_DEFAULT_COMPANY_ID) {
    return PLATFORM_DEFAULT_COMPANY_ID;
  }

  const companyAttrs = await getCompanyAttributesForPublicThemeResolve();
  const company = await Company.findByPk(cid, {
    attributes: companyAttrs as any
  });

  if (!company) {
    return PLATFORM_DEFAULT_COMPANY_ID;
  }

  if (isWhiteLabelCompany(company)) {
    return cid;
  }
  if ((company as any).allowOrgManualVisualIdentity) {
    return cid;
  }

  return PLATFORM_DEFAULT_COMPANY_ID;
}

const publicSettingsKeys: string[] = [...PUBLIC_THEME_SETTING_KEYS];

const GetPublicSettingService = async ({
  key,
  companyId
}: Request): Promise<string | undefined | null> => {
  if (!publicSettingsKeys.includes(key)) {
    return null;
  }

  const requestedId =
    companyId !== undefined && companyId !== null && !Number.isNaN(Number(companyId))
      ? Number(companyId)
      : undefined;

  const effectiveId = await resolveEffectiveCompanyIdForPublicTheme(requestedId);

  const setting = await Setting.findOne({
    where: {
      companyId: effectiveId,
      key
    }
  });

  let value = setting?.value;

  const usesOwnOrgRow =
    requestedId !== undefined &&
    requestedId !== PLATFORM_DEFAULT_COMPANY_ID &&
    effectiveId === requestedId;

  if (
    usesOwnOrgRow &&
    (value === undefined || value === null || String(value).trim() === "")
  ) {
    const plat = await Setting.findOne({
      where: {
        companyId: PLATFORM_DEFAULT_COMPANY_ID,
        key
      }
    });
    value = plat?.value;
  }

  return value ?? undefined;
};

export default GetPublicSettingService;
