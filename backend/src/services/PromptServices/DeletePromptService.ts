/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import ShowPromptService from "./ShowPromptService";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";

const ACTIVE_TICKET_STATUSES = ["open", "pending", "group", "chatbot", "nps", "lgpd"];

/**
 * Remove IA serializada em dataWebhook (fila openai/gemini) e connectionAiContext órfão
 * após exclusão do Prompt, para não invocar agente fantasma.
 */
function stripOrphanAiFromTicketDataWebhook(
  raw: unknown,
  deletedPromptId: number
): Record<string, unknown> | null {
  const d = normalizeTicketDataWebhook(raw) as Record<string, any>;
  let touched = false;
  const next: Record<string, any> = { ...d };
  const t = d.type;
  if (t === "openai" || t === "gemini") {
    delete next.settings;
    delete next.type;
    delete next.awaitingUserResponse;
    touched = true;
  }
  const ctx = next.connectionAiContext as { promptId?: unknown } | undefined;
  if (ctx != null && Number(ctx.promptId) === deletedPromptId) {
    delete next.connectionAiContext;
    touched = true;
  }
  return touched ? next : null;
}

const DeletePromptService = async (promptId: number | string, companyId: number | string): Promise<void> => {
  const pid = Number(promptId);
  const cid = Number(companyId);

  const affectedConnections = await Whatsapp.findAll({
    where: { companyId: cid, promptId: pid },
    attributes: ["id"]
  });
  const whatsappIds = affectedConnections.map(w => w.id);

  await Whatsapp.update({ promptId: null }, { where: { companyId: cid, promptId: pid } });

  if (whatsappIds.length) {
    const tickets = await Ticket.findAll({
      where: {
        companyId: cid,
        whatsappId: { [Op.in]: whatsappIds },
        status: { [Op.in]: ACTIVE_TICKET_STATUSES }
      },
      attributes: ["id", "dataWebhook"]
    });
    for (const t of tickets) {
      const nextDw = stripOrphanAiFromTicketDataWebhook(t.dataWebhook, pid);
      if (nextDw) {
        await t.update({ dataWebhook: nextDw as any });
      }
    }
  }

  const prompt = await ShowPromptService({ promptId: pid, companyId: cid });
  await prompt.destroy();
};

export default DeletePromptService;
