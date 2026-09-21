/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import { getJidOf } from "../WbotServices/getJidOf";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import logger from "../../utils/logger";

/**
 * Envia texto proativo (Baileys) e persiste com verifyMessage.
 */
export async function sendProactiveWhatsAppText(
  ticket: Ticket,
  contact: Contact,
  text: string,
  logTag: string,
  options?: { templateButtons?: any[] }
): Promise<boolean> {
  try {
    if (ticket.channel && ticket.channel !== "whatsapp") {
      logger.info(`[${logTag}] Canal ${ticket.channel} — envio proativo Baileys ignorado ticket=${ticket.id}`);
      return false;
    }

    const wbot = await getWbot(ticket.whatsappId);
    const jid = getJidOf(ticket);
    const body = `\u200e ${text.trim()}`;

    let sent: any;
    if (options?.templateButtons?.length) {
      // @ts-ignore Baileys legado
      sent = await wbot.sendMessage(jid, { text: body, templateButtons: options.templateButtons });
    } else {
      sent = await wbot.sendMessage(jid, { text: body });
    }

    await verifyMessage(sent!, ticket, contact, undefined, true, false, true);
    logger.info(`[${logTag}] Mensagem enviada ticket=${ticket.id}`);
    return true;
  } catch (e) {
    logger.error(`[${logTag}] Falha envio ticket=${ticket.id}:`, e);
    return false;
  }
}
