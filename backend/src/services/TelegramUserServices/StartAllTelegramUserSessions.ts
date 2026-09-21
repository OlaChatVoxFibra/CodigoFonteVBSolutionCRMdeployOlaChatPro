/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { startTelegramUserClient } from "./telegramUserClientManager";

export async function startAllTelegramUserSessions(): Promise<void> {
  const connections = await Whatsapp.findAll({
    where: { channel: "telegram_oficial", status: "CONNECTED" }
  });

  if (!connections.length) return;

  logger.info(
    `[TELEGRAM_USER] Iniciando ${connections.length} sessão(ões) MTProto`
  );

  for (const connection of connections) {
    try {
      if (!connection.session?.trim()) continue;
      await startTelegramUserClient(connection);
    } catch (err: any) {
      logger.warn(
        `[TELEGRAM_USER] Falha ao iniciar connection=${connection.id}: ${err.message}`
      );
      await connection.update({ status: "DISCONNECTED" });
    }
  }
}
