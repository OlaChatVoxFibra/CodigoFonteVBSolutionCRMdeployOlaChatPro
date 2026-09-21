/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ListWhatsAppsService from "../WhatsappService/ListWhatsAppsService";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import * as Sentry from "@sentry/node";
import logger from "../../utils/logger";

export const StartAllWhatsAppsSessions = async (
  companyId: number
): Promise<void> => {
  try {
    const whatsapps = await ListWhatsAppsService({ companyId });

    // ✅ CORREÇÃO: Verificar se whatsapps existe e é um array
    if (!whatsapps || !Array.isArray(whatsapps) || whatsapps.length === 0) {
      logger.info(`[StartAllWhatsAppsSessions] Nenhuma conexão WhatsApp encontrada para companyId ${companyId}`);
      return;
    }

    logger.info(`[StartAllWhatsAppsSessions] Iniciando ${whatsapps.length} sessões para companyId ${companyId}`);

    const promises = whatsapps.map(async (whatsapp) => {
      // ✅ CORREÇÃO: Verificar se whatsapp existe antes de acessar propriedades
      if (!whatsapp) {
        return;
      }

      if (whatsapp.channel === "whatsapp" && whatsapp.status !== "DISCONNECTED") {
        try {
          return await StartWhatsAppSession(whatsapp, companyId);
        } catch (sessionErr) {
          // ✅ CORREÇÃO: Logar erro individual sem interromper outras sessões
          logger.error(`[StartAllWhatsAppsSessions] Erro ao iniciar sessão ${whatsapp.id}: ${sessionErr}`);
          Sentry.captureException(sessionErr);
        }
      }
    });

    // Aguardar a resolução de todas as promessas
    await Promise.all(promises);

    logger.info(`[StartAllWhatsAppsSessions] Sessões iniciadas para companyId ${companyId}`);

  } catch (e) {
    // ✅ CORREÇÃO: Logar erro para facilitar debugging
    logger.error(`[StartAllWhatsAppsSessions] Erro geral para companyId ${companyId}: ${e}`);
    Sentry.captureException(e);
  }
};
