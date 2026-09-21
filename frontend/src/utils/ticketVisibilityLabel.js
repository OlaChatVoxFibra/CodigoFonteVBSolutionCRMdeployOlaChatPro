/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function resolveTicketVisibilityLabel(user) {
  if (!user) return "Só meus";
  if (user.profile === "admin" || user.super) return "Todos";
  const v = String(user.ticketVisibility || "").toLowerCase();
  if (v === "all") return "Todos";
  if (v === "own_queues") return "Minhas filas";
  if (v === "own_only") return "Só meus";
  if (user.allUserChat === "enabled" && user.allHistoric === "enabled") {
    return user.allTicket === "enable" || user.allTicket === "enabled"
      ? "Todos"
      : "Minhas filas";
  }
  return "Só meus";
}

export function canUserBulkClose(user) {
  if (!user) return false;
  if (user.profile === "admin" || user.super) return true;
  const v = String(user.ticketVisibility || "").toLowerCase();
  if (v === "all" || v === "own_queues" || v === "own_only") return true;
  if (user.allUserChat === "enabled" && user.allHistoric === "enabled") {
    return true;
  }
  return false;
}

export function canUserToggleShowAll(user) {
  if (!user) return false;
  if (user.profile === "admin" || user.super) return true;
  const v = String(user.ticketVisibility || "").toLowerCase();
  return v === "all" || v === "own_queues" || user.allUserChat === "enabled";
}
