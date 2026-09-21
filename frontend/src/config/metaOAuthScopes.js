/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Escopos OAuth alinhados ao App Review Meta (Messenger + Instagram Business).
 * @see https://developers.facebook.com/docs/permissions/reference
 */

const PAGE_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_messaging",
  "human_agent",
];

const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
];

const withBusinessManagement = (scopes) =>
  process.env.REACT_APP_REQUIRE_BUSINESS_MANAGEMENT?.toUpperCase() === "TRUE"
    ? [...scopes, "business_management"]
    : scopes;

/** Login Facebook Messenger (Página). */
export const META_FACEBOOK_LOGIN_SCOPE = withBusinessManagement(PAGE_SCOPES).join(",");

/** Login Instagram DM (conta profissional vinculada à Página). */
export const META_INSTAGRAM_LOGIN_SCOPE = withBusinessManagement([
  ...PAGE_SCOPES,
  ...INSTAGRAM_SCOPES,
]).join(",");
