/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

export type TelegramUserPairingMeta = {
  phoneCodeHash: string;
  phone: string;
  apiId: number;
  createdAt: number;
};

const PAIRING_TTL_MS = 15 * 60 * 1000;

export function parsePairingMeta(
  tokenMeta: string | null | undefined
): TelegramUserPairingMeta | null {
  if (!tokenMeta?.trim()) return null;
  try {
    const parsed = JSON.parse(tokenMeta) as TelegramUserPairingMeta;
    if (!parsed?.phoneCodeHash || !parsed?.phone) return null;
    if (Date.now() - Number(parsed.createdAt || 0) > PAIRING_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function savePairingMeta(
  connection: Whatsapp,
  meta: Omit<TelegramUserPairingMeta, "createdAt"> & { createdAt?: number }
): Promise<void> {
  const payload: TelegramUserPairingMeta = {
    phoneCodeHash: meta.phoneCodeHash,
    phone: meta.phone,
    apiId: meta.apiId,
    createdAt: meta.createdAt ?? Date.now()
  };
  await connection.update({
    tokenMeta: JSON.stringify(payload),
    status: "PAIRING"
  });
}

export async function clearPairingMeta(connection: Whatsapp): Promise<void> {
  await connection.update({ tokenMeta: null });
}

export function getPairingMetaOrThrow(connection: Whatsapp): TelegramUserPairingMeta {
  const meta = parsePairingMeta(connection.tokenMeta);
  if (!meta) {
    throw new AppError(
      "Código expirado ou login não iniciado. Clique em Enviar código e use o novo código recebido.",
      400
    );
  }
  return meta;
}
