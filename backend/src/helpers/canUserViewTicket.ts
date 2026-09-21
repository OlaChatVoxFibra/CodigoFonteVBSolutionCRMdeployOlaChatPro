/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import {
  resolveTicketVisibility,
  UserLikeForVisibility
} from "./ticketVisibility";

export function canUserViewTicket(
  user: UserLikeForVisibility & { id?: number; queues?: Array<{ id: number }> },
  ticket: Pick<Ticket, "userId" | "queueId" | "status" | "companyId"> & {
    isBot?: boolean;
    useIntegration?: boolean;
  }
): boolean {
  if (user.super || user.profile === "admin") {
    return true;
  }

  const visibility = resolveTicketVisibility(user);
  if (visibility === "all") {
    return true;
  }

  const userId = user.id;
  const userQueueIds = Array.isArray(user.queues)
    ? user.queues.map((q) => q.id)
    : [];

  const showTicketWithoutQueue =
    user.allTicket === "enable" || user.allTicket === "enabled";
  const canSeeOtherUsers = user.allUserChat === "enabled";
  const showTicketAllQueues = user.allHistoric === "enabled";

  if (
    ticket.status === "pending" ||
    ticket.status === "lgpd" ||
    ticket.status === "chatbot"
  ) {
    return true;
  }

  if (ticket.userId === userId) {
    return true;
  }

  if (
    ticket.status === "open" &&
    (ticket.isBot || ticket.useIntegration) &&
    ticket.queueId &&
    userQueueIds.includes(ticket.queueId)
  ) {
    return true;
  }

  if (canSeeOtherUsers && ticket.queueId && userQueueIds.includes(ticket.queueId)) {
    return true;
  }

  if (canSeeOtherUsers && showTicketAllQueues) {
    return true;
  }

  if (!ticket.queueId && showTicketWithoutQueue) {
    return true;
  }

  return false;
}
