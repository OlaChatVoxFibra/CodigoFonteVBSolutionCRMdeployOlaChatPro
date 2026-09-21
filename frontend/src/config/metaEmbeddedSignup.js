/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Fallback opcional da plataforma — preferir config por organização (Setting / API). */
export const META_APP_ID_FALLBACK =
  process.env.REACT_APP_FACEBOOK_APP_ID || "";

export const META_WHATSAPP_EMBEDDED_CONFIG_ID_FALLBACK =
  process.env.REACT_APP_META_WHATSAPP_EMBEDDED_CONFIG_ID || "";

export const EMBEDDED_SIGNUP_FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
]);
