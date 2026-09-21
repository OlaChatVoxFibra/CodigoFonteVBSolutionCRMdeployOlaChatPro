/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import { parsePairingMeta } from "./telegramUserPairing";

/** Lê sessão real no banco (lista API usa session=0 e omite o campo no SELECT). */
export async function loadTelegramOficialAuthState(
  connection: Whatsapp
): Promise<{ hasSession: boolean; pairing: ReturnType<typeof parsePairingMeta> }> {
  const row = await Whatsapp.findByPk(connection.id, {
    attributes: ["id", "channel", "status", "session", "tokenMeta"]
  });
  if (!row || row.channel !== "telegram_oficial") {
    return {
      hasSession: Boolean(String(connection.session || "").trim()),
      pairing: parsePairingMeta(connection.tokenMeta)
    };
  }
  return {
    hasSession: Boolean(String(row.session || "").trim()),
    pairing: parsePairingMeta(row.tokenMeta)
  };
}

/** Alinha status com sessão MTProto real (evita CONNECTED fantasma ou DISCONNECTED indevido). */
export async function normalizeTelegramOficialStatus(
  connection: Whatsapp
): Promise<Whatsapp> {
  if (connection.channel !== "telegram_oficial") {
    return connection;
  }

  const { hasSession, pairing } = await loadTelegramOficialAuthState(connection);

  let nextStatus = connection.status;

  if (hasSession) {
    nextStatus = "CONNECTED";
  } else if (pairing) {
    nextStatus = "PAIRING";
  } else if (connection.status === "CONNECTED" || connection.status === "OPENING") {
    nextStatus = "DISCONNECTED";
  }

  if (nextStatus !== connection.status) {
    await Whatsapp.update({ status: nextStatus }, { where: { id: connection.id } });
    return (await Whatsapp.findByPk(connection.id)) as Whatsapp;
  }

  return connection;
}

/** Metadados para listagem sem expor session/tokenMeta. */
export function attachTelegramOficialListMeta(
  whatsapp: Whatsapp
): Record<string, unknown> {
  const json = whatsapp.toJSON() as Record<string, unknown>;
  const hasSession = Boolean(String(whatsapp.getDataValue("session") || "").trim());
  json.hasMtprotoSession = hasSession || whatsapp.status === "CONNECTED";
  delete json.session;
  delete json.tokenMeta;
  return json;
}
