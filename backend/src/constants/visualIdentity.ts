/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** E-mails com acesso à UI de Identidade Visual independente do flag da empresa (lista curta). */
export const VISUAL_IDENTITY_EMAIL_ALLOWLIST = [
  "contatopousadadogolfinho@gmail.com",
  "gestaovendas@gmail.com",
  "admin@local.dev"
];

/** Chaves persistidas em Settings ligadas ao tema / marca (cores, logos, idiomas da UI). */
export const PUBLIC_THEME_SETTING_KEYS = [
  "userCreation",
  "primaryColorLight",
  "primaryColorDark",
  "buttonPrimaryColorLight",
  "buttonPrimaryColorDark",
  "buttonPrimaryTextColorLight",
  "buttonPrimaryTextColorDark",
  "buttonSecondaryColorLight",
  "buttonSecondaryColorDark",
  "topbarColorLight",
  "topbarColorDark",
  "sidebarColorLight",
  "sidebarColorDark",
  "appLogoLight",
  "appLogoDark",
  "appLogoFavicon",
  "appLogoTickets",
  "appName",
  "enabledLanguages",
  "appLogoBackgroundLight",
  "appLogoBackgroundDark"
] as const;

export type PublicThemeSettingKey = (typeof PUBLIC_THEME_SETTING_KEYS)[number];
