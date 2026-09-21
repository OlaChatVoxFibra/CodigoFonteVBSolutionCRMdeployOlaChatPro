/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import { getIO } from "../../libs/socket";
import ShowTicketService from "./ShowTicketService";

/**
 * Após o agente de IA enviar mensagem ao cliente, o ticket deve aparecer em "Atendendo"
 * (status open + isBot), não permanecer em "Aguardando".
 */
const NON_REOPEN_STATUSES = new Set(["closed", "nps"]);

export async function markTicketUnderAgentAttendance(ticket: Ticket): Promise<void> {
  const fresh = await Ticket.findByPk(ticket.id, {
    attributes: ["id", "companyId", "status", "userId", "isBot", "useIntegration"]
  });
  if (!fresh || NON_REOPEN_STATUSES.has(String(fresh.status))) {
    return;
  }

  if (fresh.userId != null && fresh.userId !== 0) {
    if (fresh.status !== "open") {
      await fresh.update({ status: "open" });
    }
  } else {
    const patch: Record<string, unknown> = {
      status: "open",
      isBot: true
    };
    if (fresh.useIntegration !== false) {
      patch.useIntegration = true;
    }
    const needsUpdate =
      fresh.status !== "open" ||
      fresh.isBot !== true ||
      (patch.useIntegration === true && fresh.useIntegration !== true);
    if (needsUpdate) {
      await fresh.update(patch);
    }
  }

  try {
    const io = getIO();
    const full = await ShowTicketService(fresh.id, fresh.companyId);
    io.of(String(fresh.companyId)).emit(`company-${fresh.companyId}-ticket`, {
      action: "update",
      ticket: full,
      ticketId: fresh.id
    });
  } catch {
    /* socket opcional */
  }
}
