/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Normaliza telefone para E.164 (Twilio). Brasil: adiciona +55 se faltar DDI.
 */
export function normalizeSmsNumber(raw: string): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  if (String(raw).trim().startsWith("+")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function smsNumbersMatch(a: string, b: string): boolean {
  const da = normalizeSmsNumber(a).replace(/\D/g, "");
  const db = normalizeSmsNumber(b).replace(/\D/g, "");
  if (!da || !db) return false;
  if (da === db) return true;
  const short = da.length <= db.length ? da : db;
  const long = da.length > db.length ? da : db;
  return long.endsWith(short) && short.length >= 10;
}
