/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import { parseAgentProactiveSettings } from "../../types/agentProactiveSettings";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import { mergeAgentProactiveState, getAgentProactiveState } from "./agentProactiveTicketState";
import { textMatchesHotLead } from "./hotLeadKeywords";
import logger from "../../utils/logger";

/**
 * Chamado quando o cliente envia mensagem (texto) e o ticket está no fluxo do agente.
 */
export async function onAgentUserInboundText(
  ticket: Ticket,
  bodyText: string
): Promise<void> {
  try {
    const row = await ListSettingsServiceOne({ companyId: ticket.companyId, key: "agent_proactive" });
    const settings = parseAgentProactiveSettings(
      row?.value
        ? typeof row.value === "string"
          ? JSON.parse(row.value as string)
          : row.value
        : null
    );
    if (!settings.enabled) return;

    const now = new Date().toISOString();
    const prev = getAgentProactiveState(ticket);
    const patch: Record<string, unknown> = {
      lastUserInboundAt: now,
      followUpAttempts: 0,
      lastFollowUpAt: undefined
    };

    if (settings.hotLeadEnabled !== false && textMatchesHotLead(bodyText, settings)) {
      if (!prev.hotProposalSent) {
        patch.hotPending = true;
        logger.info(`[HOT LEAD] Marcado hotPending ticket=${ticket.id}`);
      }
    }

    await ticket.update({
      dataWebhook: mergeAgentProactiveState(ticket, patch as any)
    });
  } catch (e) {
    logger.warn(`[HOT LEAD] onAgentUserInboundText falhou ticket=${ticket.id}:`, e);
  }
}
