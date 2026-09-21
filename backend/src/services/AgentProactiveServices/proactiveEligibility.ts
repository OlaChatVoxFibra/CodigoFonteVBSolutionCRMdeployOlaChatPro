/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";

export async function ticketEligibleForProactiveAi(ticket: Ticket): Promise<boolean> {
  if (ticket.isGroup || ticket.userId) return false;
  if (ticket.status !== "pending" && ticket.status !== "open") return false;
  if (!ticket.isBot) return false;

  const w = await Whatsapp.findByPk(ticket.whatsappId);
  if (!w) return false;
  if ((w as any).agentDisabled === true) return false;

  if (w.promptId) return true;

  try {
    const integ = await ListSettingsServiceOne({ companyId: ticket.companyId, key: "agent_integration" });
    const v = integ?.value
      ? typeof integ.value === "string"
        ? JSON.parse(integ.value as string)
        : integ.value
      : null;
    if (v?.apiKey && v?.active !== false) return true;
  } catch {
    /* ignore */
  }

  return false;
}
