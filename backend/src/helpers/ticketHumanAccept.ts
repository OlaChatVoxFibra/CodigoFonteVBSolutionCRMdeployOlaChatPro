/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";

/** Ticket já assumido por humano (ex.: após Aceitar) — não reativar IA na próxima mensagem. */
export function isHumanAttendantTicket(ticket: Pick<Ticket, "userId" | "isBot">): boolean {
  const uid = Number(ticket.userId);
  return uid > 0 && ticket.isBot === false;
}

/**
 * Aceite manual (botão Aceitar): pending → open/group com atendente.
 * Também cobre payload explícito com isBot=false do frontend.
 */
export function isManualTicketAccept(params: {
  status?: string;
  userId?: number | null;
  oldStatus: string;
  oldUserId?: number | null;
  explicitIsBot?: boolean;
}): boolean {
  const uid = Number(params.userId);
  if (!uid || uid <= 0) return false;

  const nextStatus = String(params.status || "");
  if (nextStatus !== "open" && nextStatus !== "group") return false;

  if (params.explicitIsBot === false) return true;

  if (params.oldStatus !== "pending") return false;

  return params.oldUserId == null || Number(params.oldUserId) !== uid;
}

export function humanAcceptTicketFlags(): {
  isBot: false;
  useIntegration: false;
  integrationId: null;
} {
  return {
    isBot: false,
    useIntegration: false,
    integrationId: null
  };
}
