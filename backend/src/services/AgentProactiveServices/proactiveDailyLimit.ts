/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { AgentProactiveTicketState } from "../../types/agentProactiveSettings";

const TZ = "America/Sao_Paulo";

export function proactiveDayKeySaoPaulo(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function canSendAnotherProactiveToday(
  st: AgentProactiveTicketState,
  maxPerDay?: number
): boolean {
  if (maxPerDay == null || maxPerDay <= 0) return true;
  const day = proactiveDayKeySaoPaulo();
  if (st.proactiveSentDay !== day) return true;
  return (st.proactiveSentCount || 0) < maxPerDay;
}

export function bumpProactiveDailyCount(st: AgentProactiveTicketState): Partial<AgentProactiveTicketState> {
  const day = proactiveDayKeySaoPaulo();
  if (st.proactiveSentDay !== day) {
    return { proactiveSentDay: day, proactiveSentCount: 1 };
  }
  return { proactiveSentCount: (st.proactiveSentCount || 0) + 1 };
}
