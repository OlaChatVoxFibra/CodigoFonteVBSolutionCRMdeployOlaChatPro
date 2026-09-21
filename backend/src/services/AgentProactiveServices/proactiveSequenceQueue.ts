/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import { parseAgentProactiveSettings } from "../../types/agentProactiveSettings";
import { generateProactiveMessage } from "./proactiveOpenAi";
import { sendProactiveWhatsAppText } from "./proactiveSendWhatsApp";
import { ticketEligibleForProactiveAi } from "./proactiveEligibility";
import { getAgentProactiveState, mergeAgentProactiveState } from "./agentProactiveTicketState";
import { sendProactiveContextMediaAfterText } from "./proactiveSendContextMedia";
import { bumpProactiveDailyCount } from "./proactiveDailyLimit";
import { passesProactiveGuards } from "./proactiveTicketGuards";
import logger from "../../utils/logger";

/**
 * Processa um toque da sequência pós–cold outreach (Bull job em campaignQueue).
 */
export async function handleAgentProactiveSequenceJob(job: { data: any }): Promise<void> {
  const { companyId, ticketId, stepIndex } = job.data || {};
  if (!companyId || !ticketId || stepIndex == null) {
    logger.warn("[SEQ] Job sem dados completos");
    return;
  }

  const ticket = await Ticket.findByPk(ticketId, {
    include: [{ model: Contact, as: "contact", required: true }]
  });
  if (!ticket?.contact) {
    logger.warn(`[SEQ] Ticket ${ticketId} sem contato`);
    return;
  }

  const row = await ListSettingsServiceOne({ companyId, key: "agent_proactive" });
  const settings = parseAgentProactiveSettings(
    row?.value
      ? typeof row.value === "string"
        ? JSON.parse(row.value as string)
        : row.value
      : null
  );
  if (!settings.enabled) return;

  const steps = settings.sequences?.cold_outreach || [];
  if (stepIndex < 0 || stepIndex >= steps.length) return;

  const lastOut = await Message.findOne({
    where: { ticketId, fromMe: true },
    order: [["createdAt", "DESC"]]
  });
  const lastIn = await Message.findOne({
    where: { ticketId, fromMe: false },
    order: [["createdAt", "DESC"]]
  });
  if (
    lastOut?.createdAt &&
    lastIn?.createdAt &&
    new Date(lastIn.createdAt) > new Date(lastOut.createdAt)
  ) {
    logger.info(`[SEQ] Usuário respondeu após último envio — pulando ticket ${ticketId}`);
    return;
  }

  if (!(await ticketEligibleForProactiveAi(ticket))) return;
  if (ticket.contact.disableBot) return;

  if (!(await passesProactiveGuards(companyId, ticket, settings, "cold_outreach"))) return;

  const st = getAgentProactiveState(ticket);

  const step = steps[stepIndex];
  const text = await generateProactiveMessage({
    companyId,
    ticket,
    contact: ticket.contact,
    context: "cold_outreach",
    settings,
    extraHint: step.hint
  });
  if (!text) return;

  const ok = await sendProactiveWhatsAppText(ticket, ticket.contact, text, "COLD OUTREACH SEQ");
  if (!ok) return;

  const daily = bumpProactiveDailyCount(st);
  await ticket.update({
    dataWebhook: mergeAgentProactiveState(ticket, daily)
  });

  await sendProactiveContextMediaAfterText(
    ticket.contactId,
    "cold_outreach",
    settings,
    ticket.id
  );

  const next = stepIndex + 1;
  if (next < steps.length) {
    const delayMs = Math.max(
      3600000,
      (steps[next].delayHours || 24) * 3600000
    );
    try {
      const { campaignQueue } = require("../../queues");
      await campaignQueue.add(
        "AgentProactiveSequenceTouch",
        { companyId, ticketId, stepIndex: next },
        {
          delay: delayMs,
          removeOnComplete: true,
          jobId: `ap-seq-${companyId}-${ticketId}-${next}-${Date.now()}`
        }
      );
    } catch (e) {
      logger.error("[SEQ] Falha ao agendar próximo passo:", e);
    }
  }
}

export function scheduleColdOutreachSequenceJob(
  companyId: number,
  ticketId: number,
  delayHours: number
): void {
  try {
    const { campaignQueue } = require("../../queues");
    const delayMs = Math.max(3600000, (delayHours || 24) * 3600000);
    void campaignQueue.add(
      "AgentProactiveSequenceTouch",
      { companyId, ticketId, stepIndex: 0 },
      {
        delay: delayMs,
        removeOnComplete: true,
        jobId: `ap-seq-${companyId}-${ticketId}-0-${Date.now()}`
      }
    );
  } catch (e) {
    logger.error("[SEQ] Falha ao agendar sequência:", e);
  }
}
