/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import { parseAgentProactiveSettings } from "../../types/agentProactiveSettings";
import { getColdOutreachDelayMs, sleep } from "./agentProactiveEnv";
import { generateProactiveMessage } from "./proactiveOpenAi";
import { sendProactiveWhatsAppText } from "./proactiveSendWhatsApp";
import { ticketEligibleForProactiveAi } from "./proactiveEligibility";
import { getAgentProactiveState, mergeAgentProactiveState } from "./agentProactiveTicketState";
import { bumpProactiveDailyCount } from "./proactiveDailyLimit";
import { sendProactiveContextMediaAfterText } from "./proactiveSendContextMedia";
import { passesProactiveGuards } from "./proactiveTicketGuards";
import { scheduleColdOutreachSequenceJob } from "./proactiveSequenceQueue";
import logger from "../../utils/logger";

export type ColdOutreachContactRef = { id: number };

/**
 * Dispara mensagem de prospecção fria para uma lista de contatos (usa último ticket do contato).
 * Delay configurável entre envios (padrão 60s via AGENT_COLD_OUTREACH_DELAY_MS).
 */
export async function sendColdOutreach(
  companyId: number,
  contacts: ColdOutreachContactRef[]
): Promise<void> {
  const row = await ListSettingsServiceOne({ companyId, key: "agent_proactive" });
  const settings = parseAgentProactiveSettings(
    row?.value
      ? typeof row.value === "string"
        ? JSON.parse(row.value as string)
        : row.value
      : null
  );
  if (!settings.enabled) {
    logger.info("[COLD OUTREACH] agent_proactive desligado — abortando");
    return;
  }

  const delayMs = getColdOutreachDelayMs();

  for (let i = 0; i < contacts.length; i++) {
    const { id: contactId } = contacts[i];
    try {
      const contact = await Contact.findByPk(contactId);
      if (!contact || contact.companyId !== companyId) {
        logger.warn(`[COLD OUTREACH] Contato inválido ${contactId}`);
        continue;
      }
      if (contact.disableBot) continue;

      const ticket = await Ticket.findOne({
        where: { contactId, companyId },
        order: [["updatedAt", "DESC"]],
        include: [{ model: Contact, as: "contact", required: true }]
      });
      if (!ticket) {
        logger.warn(`[COLD OUTREACH] Sem ticket para contato ${contactId}`);
        continue;
      }

      await ticket.reload({ include: [{ model: Contact, as: "contact", required: true }] });
      if (!(await ticketEligibleForProactiveAi(ticket))) continue;
      if (!(await passesProactiveGuards(companyId, ticket, settings, "cold_outreach"))) continue;

      const text = await generateProactiveMessage({
        companyId,
        ticket,
        contact: ticket.contact || contact,
        context: "cold_outreach",
        settings
      });
      if (!text) continue;

      const ok = await sendProactiveWhatsAppText(
        ticket,
        ticket.contact || contact,
        text,
        "COLD OUTREACH"
      );
      if (!ok) continue;

      const st = getAgentProactiveState(ticket);
      await ticket.update({
        dataWebhook: mergeAgentProactiveState(ticket, bumpProactiveDailyCount(st))
      });

      await sendProactiveContextMediaAfterText(
        contactId,
        "cold_outreach",
        settings,
        ticket.id
      );

      const steps = settings.sequences?.cold_outreach;
      if (steps?.length) {
        scheduleColdOutreachSequenceJob(companyId, ticket.id, steps[0].delayHours || 24);
      }
    } catch (e) {
      logger.error(`[COLD OUTREACH] Erro contato ${contactId}:`, e);
    }

    if (i < contacts.length - 1) {
      await sleep(delayMs);
    }
  }
}
