/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import logger from "../../utils/logger";
import * as Sentry from "@sentry/node";
import { redisGroupCache } from "../../utils/RedisGroupCache";

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  // ✅ CORREÇÃO: Verificar se whatsapp existe
  if (!whatsapp) {
    logger.error(`[StartWhatsAppSession] Whatsapp não fornecido para companyId ${companyId}`);
    return;
  }

  // ✅ CORREÇÃO: Forçar uso do companyId do WhatsApp para garantir namespace correto (Super Admin)
  const sessionCompanyId = whatsapp.companyId;

  try {
    await whatsapp.update({ status: "OPENING" });
  } catch (updateErr) {
    logger.error(`[StartWhatsAppSession] Erro ao atualizar status: ${updateErr}`);
  }

  const io = getIO();
  io.of("/" + String(sessionCompanyId))
    .emit(`company-${sessionCompanyId}-whatsappSession`, {
      action: "update",
      session: whatsapp
    });

  try {
    const wbot = await initWASocket(whatsapp);

    // ✅ CORREÇÃO: Verificar se wbot foi inicializado corretamente
    if (!wbot) {
      logger.error(`[StartWhatsAppSession] Falha ao inicializar wbot para whatsapp ${whatsapp.id}`);
      return;
    }

    if (wbot.id) {
      wbotMessageListener(wbot, sessionCompanyId);
      wbotMonitor(wbot, whatsapp, sessionCompanyId);
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`[StartWhatsAppSession] Erro ao iniciar sessão whatsapp ${whatsapp.id}: ${err}`);
    await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
    io.of("/" + String(sessionCompanyId))
      .emit(`company-${sessionCompanyId}-whatsappSession`, {
        action: "update",
        session: whatsapp
      });
  }
};
