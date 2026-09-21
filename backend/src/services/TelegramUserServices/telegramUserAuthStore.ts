/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Cache opcional em memória (mesmo processo). O phoneCodeHash oficial fica em Whatsapp.tokenMeta.
 */
import { TelegramClient } from "telegram";

export type PendingTelegramUserAuth = {
  connectionId: number;
  phone: string;
  phoneCodeHash: string;
  client?: TelegramClient;
  createdAt: number;
};

const pending = new Map<number, PendingTelegramUserAuth>();

export function setPendingTelegramUserAuth(data: PendingTelegramUserAuth): void {
  const old = pending.get(data.connectionId);
  if (old?.client && old.client !== data.client) {
    old.client.disconnect().catch(() => undefined);
  }
  pending.set(data.connectionId, data);
}

export function getPendingTelegramUserAuth(
  connectionId: number
): PendingTelegramUserAuth | undefined {
  return pending.get(connectionId);
}

/** Remove pendência sem desconectar (ex.: após login OK → vira cliente ativo). */
export function releasePendingTelegramUserAuth(connectionId: number): void {
  pending.delete(connectionId);
}

export function clearPendingTelegramUserAuth(connectionId: number): void {
  const old = pending.get(connectionId);
  if (old?.client) {
    old.client.disconnect().catch(() => undefined);
  }
  pending.delete(connectionId);
}
