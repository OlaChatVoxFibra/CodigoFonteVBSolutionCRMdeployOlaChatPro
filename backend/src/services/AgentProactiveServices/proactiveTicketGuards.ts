/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import {
  AgentProactiveSettings,
  ProactiveContextType
} from "../../types/agentProactiveSettings";
import { getAgentProactiveState } from "./agentProactiveTicketState";
import { isWithinProactiveBusinessHours } from "./proactiveBusinessHours";
import { contactMatchesProactiveSegment } from "./proactiveSegmentFilter";
import { canSendAnotherProactiveToday } from "./proactiveDailyLimit";

export async function passesProactiveGuards(
  companyId: number,
  ticket: Ticket,
  settings: AgentProactiveSettings,
  context: ProactiveContextType
): Promise<boolean> {
  if (!isWithinProactiveBusinessHours(settings.businessHours)) return false;
  const contact = ticket.contact;
  if (!contact) return false;
  if (settings.applySegmentFilters !== false) {
    if (!(await contactMatchesProactiveSegment(contact, companyId, context, settings.segments)))
      return false;
  }
  const st = getAgentProactiveState(ticket);
  if (!canSendAnotherProactiveToday(st, settings.maxProactivePerContactPerDay)) return false;
  return true;
}
