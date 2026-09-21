/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** ID do contato para buscar foto de perfil (Telegram preserva ID negativo em grupos). */
export function contactProfileNumber(channel, number) {
  const raw = String(number || "").trim();
  if (!raw) return "";
  if (channel === "linkedin") {
    return raw.split("@")[0].trim() || raw;
  }
  if (channel === "telegram" || channel === "telegram_oficial") {
    const base = raw.split("@")[0].trim();
    if (/^-?\d+$/.test(base)) return base;
    return base.replace(/\D/g, "") || base;
  }
  return raw.replace(/\D/g, "") || raw;
}
