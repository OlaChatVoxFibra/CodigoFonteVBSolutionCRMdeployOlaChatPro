/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";

export function parseApiId(raw: string | number | null | undefined): number {
  const n = Number(String(raw || "").trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(
      "api_id inválido. Obtenha em https://my.telegram.org/apps",
      400
    );
  }
  return Math.floor(n);
}

export function parseApiHash(raw: string | null | undefined): string {
  const hash = String(raw || "").trim();
  if (hash.length < 8) {
    throw new AppError(
      "api_hash inválido. Obtenha em https://my.telegram.org/apps",
      400
    );
  }
  return hash;
}

export function normalizePhoneE164(phone: string): string {
  let p = phone.trim().replace(/\s/g, "");
  if (p.startsWith("@")) {
    throw new AppError(
      "Informe o número de celular com DDI (+55...), não o @username do Telegram.",
      400
    );
  }
  const digits = p.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    throw new AppError(
      "Número inválido. Use DDI + DDD + número (ex.: +5541989046696).",
      400
    );
  }
  if (!p.startsWith("+")) {
    p = `+${digits}`;
  } else {
    p = `+${digits}`;
  }
  return p;
}

/** Valida e normaliza telefone informado pelo usuário (salvar / enviar código). */
export function validateAndNormalizePhone(phoneNumber: string): string {
  return normalizePhoneE164(String(phoneNumber || "").trim());
}

/** Telefone E.164 persistido — nunca usa @username do campo number. */
export function resolveTelegramUserPhone(connection: Whatsapp): string {
  const stored = String(connection.phone_number || "").trim();
  if (stored && !stored.startsWith("@")) {
    try {
      return normalizePhoneE164(stored);
    } catch {
      /* tenta number */
    }
  }

  const fallback = String(connection.number || "").trim();
  if (fallback.startsWith("@")) {
    throw new AppError(
      "Telefone da conexão está como @username. Salve o celular com DDI (+5541989046696) em Número de telefone e clique em Salvar credenciais.",
      400
    );
  }

  if (!fallback || fallback.length < 8) {
    throw new AppError(
      "Informe o número de telefone com DDI (ex.: +5541989046696).",
      400
    );
  }

  return normalizePhoneE164(fallback);
}

export function getTelegramUserCredentials(connection: Whatsapp): {
  apiId: number;
  apiHash: string;
  phone: string;
} {
  const apiId = parseApiId(
    connection.facebookUserId || process.env.TELEGRAM_API_ID
  );
  const apiHash = parseApiHash(
    connection.token || process.env.TELEGRAM_API_HASH
  );
  const phone = resolveTelegramUserPhone(connection);
  return { apiId, apiHash, phone };
}

export function getTelegramUserDisplayLabel(connection: Whatsapp): string | null {
  const n = String(connection.number || "").trim();
  if (n.startsWith("@")) return n;
  return null;
}
