/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";
import UpdateSettingService from "../SettingServices/UpdateSettingService";

export const META_EMBEDDED_SETTING_KEYS = {
  appId: "metaWhatsappAppId",
  configId: "metaWhatsappEmbeddedConfigId",
  appSecret: "metaWhatsappAppSecret"
} as const;

const readSetting = async (
  companyId: number,
  key: string
): Promise<string> => {
  const row = await Setting.findOne({ where: { companyId, key } });
  return String(row?.value || "").trim();
};

/** Credenciais Embedded Signup da empresa (fallback opcional no env da plataforma). */
export const getCompanyMetaEmbeddedConfig = async (
  companyId: number
): Promise<{
  appId: string;
  configId: string;
  appSecret: string;
  configured: boolean;
  hasAppSecret: boolean;
  source: "company" | "platform" | "mixed";
}> => {
  const companyAppId = await readSetting(
    companyId,
    META_EMBEDDED_SETTING_KEYS.appId
  );
  const companyConfigId = await readSetting(
    companyId,
    META_EMBEDDED_SETTING_KEYS.configId
  );
  const companySecret = await readSetting(
    companyId,
    META_EMBEDDED_SETTING_KEYS.appSecret
  );

  const platformAppId = (process.env.FACEBOOK_APP_ID || "").trim();
  const platformConfigId = (
    process.env.META_WHATSAPP_EMBEDDED_CONFIG_ID || ""
  ).trim();
  const platformSecret = (process.env.FACEBOOK_APP_SECRET || "").trim();

  const appId = companyAppId || platformAppId;
  const configId = companyConfigId || platformConfigId;
  const appSecret = companySecret || platformSecret;

  const source =
    companyAppId && companyConfigId
      ? "company"
      : !companyAppId && !companyConfigId && appId && configId
      ? "platform"
      : "mixed";

  return {
    appId,
    configId,
    appSecret,
    configured: Boolean(appId && configId),
    hasAppSecret: Boolean(appSecret),
    source
  };
};

export const saveCompanyMetaEmbeddedConfig = async (params: {
  companyId: number;
  appId?: string;
  configId?: string;
  appSecret?: string;
}): Promise<void> => {
  const { companyId, appId, configId, appSecret } = params;

  if (appId !== undefined) {
    await UpdateSettingService({
      companyId,
      key: META_EMBEDDED_SETTING_KEYS.appId,
      value: String(appId).trim()
    });
  }

  if (configId !== undefined) {
    await UpdateSettingService({
      companyId,
      key: META_EMBEDDED_SETTING_KEYS.configId,
      value: String(configId).trim()
    });
  }

  if (appSecret !== undefined) {
    await UpdateSettingService({
      companyId,
      key: META_EMBEDDED_SETTING_KEYS.appSecret,
      value: String(appSecret).trim()
    });
  }
};
