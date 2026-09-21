/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type TicketVisibility = "all" | "own_queues" | "own_only";

export interface TicketVisibilityFlags {
  allTicket: string;
  allHistoric: string;
  allUserChat: string;
}

export interface UserLikeForVisibility {
  profile?: string;
  super?: boolean;
  ticketVisibility?: string | null;
  allTicket?: string | null;
  allHistoric?: string | null;
  allUserChat?: string | null;
}

export function normalizeTicketVisibility(
  value?: string | null
): TicketVisibility {
  const v = String(value || "").toLowerCase();
  if (v === "all" || v === "own_queues" || v === "own_only") {
    return v;
  }
  return "own_only";
}

export function ticketVisibilityToFlags(
  visibility: TicketVisibility
): TicketVisibilityFlags {
  switch (visibility) {
    case "all":
      return {
        allTicket: "enable",
        allHistoric: "enabled",
        allUserChat: "enabled"
      };
    case "own_queues":
      return {
        allTicket: "disable",
        allHistoric: "enabled",
        allUserChat: "enabled"
      };
    case "own_only":
    default:
      return {
        allTicket: "disable",
        allHistoric: "disabled",
        allUserChat: "disabled"
      };
  }
}

export function resolveTicketVisibility(
  user: UserLikeForVisibility
): TicketVisibility {
  if (user.profile === "admin" || user.super) {
    return "all";
  }

  if (user.ticketVisibility) {
    return normalizeTicketVisibility(user.ticketVisibility);
  }

  const allTicket =
    user.allTicket === "enable" || user.allTicket === "enabled";
  const allHistoric = user.allHistoric === "enabled";
  const allUserChat = user.allUserChat === "enabled";

  if (allTicket && allHistoric && allUserChat) {
    return "all";
  }
  if (allHistoric && allUserChat) {
    return "own_queues";
  }
  return "own_only";
}

export function getTicketVisibilityFlags(
  user: UserLikeForVisibility
): TicketVisibilityFlags {
  return ticketVisibilityToFlags(resolveTicketVisibility(user));
}

export function canUserBulkCloseTickets(user: UserLikeForVisibility): boolean {
  if (user.profile === "admin" || user.super) {
    return true;
  }
  const visibility = resolveTicketVisibility(user);
  return (
    visibility === "all" ||
    visibility === "own_queues" ||
    visibility === "own_only"
  );
}
