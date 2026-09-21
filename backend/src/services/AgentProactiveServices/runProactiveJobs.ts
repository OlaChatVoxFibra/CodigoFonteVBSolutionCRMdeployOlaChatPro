/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import { subDays, subWeeks } from "date-fns";
import Company from "../../models/Company";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import {
  parseAgentProactiveSettings,
  AgentProactiveSettings
} from "../../types/agentProactiveSettings";
import { getFollowUpAfterDays, getBulkDelayMs, sleep } from "./agentProactiveEnv";
import { getAgentProactiveState, mergeAgentProactiveState } from "./agentProactiveTicketState";
import { ticketEligibleForProactiveAi } from "./proactiveEligibility";
import { generateProactiveMessage } from "./proactiveOpenAi";
import { sendProactiveWhatsAppText } from "./proactiveSendWhatsApp";
import { isWithinProactiveBusinessHours } from "./proactiveBusinessHours";
import { sendProactiveContextMediaAfterText } from "./proactiveSendContextMedia";
import { bumpProactiveDailyCount } from "./proactiveDailyLimit";
import { passesProactiveGuards } from "./proactiveTicketGuards";
import logger from "../../utils/logger";

async function loadProactiveSettings(companyId: number): Promise<AgentProactiveSettings | null> {
  const row = await ListSettingsServiceOne({ companyId, key: "agent_proactive" });
  const s = parseAgentProactiveSettings(
    row?.value
      ? typeof row.value === "string"
        ? JSON.parse(row.value as string)
        : row.value
      : null
  );
  return s.enabled ? s : null;
}

async function lastUserInboundTime(ticketId: number): Promise<Date | null> {
  const m = await Message.findOne({
    where: { ticketId, fromMe: false },
    order: [["createdAt", "DESC"]]
  });
  return m?.createdAt ? new Date(m.createdAt) : null;
}

export async function runFollowUpJob(): Promise<void> {
  logger.info("[FOLLOW-UP] Job iniciado");
  const companies = await Company.findAll({ where: { status: true }, attributes: ["id"] });

  for (const { id: companyId } of companies) {
    try {
      const settings = await loadProactiveSettings(companyId);
      if (!settings?.followUpEnabled) continue;
      if (!isWithinProactiveBusinessHours(settings.businessHours)) continue;

      const days = getFollowUpAfterDays(settings.followUpAfterDays);
      const threshold = subDays(new Date(), days);

      const tickets = await Ticket.findAll({
        where: {
          companyId,
          isBot: true,
          userId: { [Op.is]: null },
          isGroup: false,
          status: { [Op.in]: ["pending", "open"] }
        },
        include: [{ model: Contact, as: "contact", required: true }],
        limit: 300
      });

      const delayMs = getBulkDelayMs();
      for (const ticket of tickets) {
        try {
          if (!(await ticketEligibleForProactiveAi(ticket))) continue;
          if (ticket.contact?.disableBot) continue;

          const st = getAgentProactiveState(ticket);
          if (st.automationInactive) continue;
          const attempts = st.followUpAttempts || 0;
          const maxFu = Math.max(1, Math.min(15, Number(settings.maxFollowUpAttempts) || 3));
          if (attempts >= maxFu) continue;

          const lastUser = await lastUserInboundTime(ticket.id);
          if (!lastUser || lastUser > threshold) continue;

          const lastFu = st.lastFollowUpAt ? new Date(st.lastFollowUpAt) : null;
          if (lastFu && lastFu > threshold) continue;

          const minH = Math.max(0, Math.min(168, Number(settings.minHoursBetweenFollowUps) || 0));
          if (minH > 0 && lastFu) {
            const msSince = Date.now() - lastFu.getTime();
            if (msSince < minH * 3600000) continue;
          }

          if (!(await passesProactiveGuards(companyId, ticket, settings, "follow_up"))) continue;

          const text = await generateProactiveMessage({
            companyId,
            ticket,
            contact: ticket.contact,
            context: "follow_up",
            settings
          });
          if (!text) continue;

          const ok = await sendProactiveWhatsAppText(
            ticket,
            ticket.contact,
            text,
            "FOLLOW-UP"
          );
          if (!ok) continue;

          const nextAttempts = attempts + 1;
          const daily = bumpProactiveDailyCount(st);
          const patch: Record<string, unknown> = {
            followUpAttempts: nextAttempts,
            lastFollowUpAt: new Date().toISOString(),
            ...daily
          };
          if (nextAttempts >= maxFu) {
            patch.automationInactive = true;
            patch.inactiveMarkedAt = new Date().toISOString();
            logger.info(
              `[FOLLOW-UP] Ticket ${ticket.id} marcado inativo após ${maxFu} tentativa(s)`
            );
          }

          await ticket.update({
            dataWebhook: mergeAgentProactiveState(ticket, patch)
          });

          await sendProactiveContextMediaAfterText(
            ticket.contactId,
            "follow_up",
            settings,
            ticket.id
          );
        } catch (e) {
          logger.error(`[FOLLOW-UP] Erro ticket ${ticket.id}:`, e);
        }
        await sleep(delayMs);
      }
    } catch (e) {
      logger.error(`[FOLLOW-UP] Erro company ${companyId}:`, e);
    }
  }
  logger.info("[FOLLOW-UP] Job concluído");
}

export async function runHotLeadJob(): Promise<void> {
  logger.info("[HOT LEAD] Job iniciado");
  const companies = await Company.findAll({ where: { status: true }, attributes: ["id"] });

  for (const { id: companyId } of companies) {
    try {
      const settings = await loadProactiveSettings(companyId);
      if (!settings?.hotLeadEnabled) continue;
      if (!isWithinProactiveBusinessHours(settings.businessHours)) continue;

      const tickets = await Ticket.findAll({
        where: {
          companyId,
          isBot: true,
          userId: { [Op.is]: null },
          isGroup: false,
          status: { [Op.in]: ["pending", "open"] }
        },
        include: [{ model: Contact, as: "contact", required: true }],
        limit: 200
      });

      const delayMs = getBulkDelayMs();
      for (const ticket of tickets) {
        try {
          if (!(await ticketEligibleForProactiveAi(ticket))) continue;
          const st = getAgentProactiveState(ticket);
          if (!st.hotPending || st.hotProposalSent) continue;

          if (!(await passesProactiveGuards(companyId, ticket, settings, "hot_lead"))) continue;

          const text = await generateProactiveMessage({
            companyId,
            ticket,
            contact: ticket.contact,
            context: "hot_lead",
            settings
          });
          if (!text) continue;

          const buttons =
            settings.useHotLeadButtons !== false
              ? [
                  {
                    index: 1,
                    quickReplyButton: {
                      displayText: "Quero a proposta",
                      id: "hot_proposal_yes"
                    }
                  },
                  {
                    index: 2,
                    quickReplyButton: {
                      displayText: "Falar agora",
                      id: "hot_talk_now"
                    }
                  }
                ]
              : undefined;

          const ok = await sendProactiveWhatsAppText(
            ticket,
            ticket.contact,
            text,
            "HOT LEAD",
            buttons ? { templateButtons: buttons as any } : undefined
          );
          if (!ok) continue;

          const daily = bumpProactiveDailyCount(st);
          await ticket.update({
            dataWebhook: mergeAgentProactiveState(ticket, {
              hotProposalSent: true,
              hotPending: false,
              ...daily
            })
          });

          await sendProactiveContextMediaAfterText(
            ticket.contactId,
            "hot_lead",
            settings,
            ticket.id
          );
        } catch (e) {
          logger.error(`[HOT LEAD] Erro ticket ${ticket.id}:`, e);
        }
        await sleep(delayMs);
      }
    } catch (e) {
      logger.error(`[HOT LEAD] Erro company ${companyId}:`, e);
    }
  }
  logger.info("[HOT LEAD] Job concluído");
}

export async function runReengagementJob(): Promise<void> {
  logger.info("[REENGAGEMENT] Job iniciado");
  const companies = await Company.findAll({ where: { status: true }, attributes: ["id"] });

  for (const { id: companyId } of companies) {
    try {
      const settings = await loadProactiveSettings(companyId);
      if (settings.reengagementEnabled === false) continue;
      if (!isWithinProactiveBusinessHours(settings.businessHours)) continue;

      const weeks = Math.max(1, settings.reengageAfterWeeks || 2);
      const inactiveBefore = subWeeks(new Date(), weeks);

      const tickets = await Ticket.findAll({
        where: {
          companyId,
          isBot: true,
          userId: { [Op.is]: null },
          isGroup: false,
          status: { [Op.in]: ["pending", "open"] }
        },
        include: [{ model: Contact, as: "contact", required: true }],
        limit: 200
      });

      const delayMs = getBulkDelayMs();
      for (const ticket of tickets) {
        try {
          if (!(await ticketEligibleForProactiveAi(ticket))) continue;
          const st = getAgentProactiveState(ticket);
          if (!st.automationInactive || !st.inactiveMarkedAt) continue;

          const marked = new Date(st.inactiveMarkedAt);
          if (marked > inactiveBefore) continue;

          const lastRe = st.lastReengagementAt ? new Date(st.lastReengagementAt) : null;
          if (lastRe && lastRe > subDays(new Date(), 7)) continue;

          const maxRe = settings.maxReengagementAttempts;
          if (maxRe != null && maxRe > 0 && (st.reengagementAttempts || 0) >= maxRe) {
            continue;
          }

          if (!(await passesProactiveGuards(companyId, ticket, settings, "reengagement"))) continue;

          const text = await generateProactiveMessage({
            companyId,
            ticket,
            contact: ticket.contact,
            context: "reengagement",
            settings
          });
          if (!text) continue;

          const ok = await sendProactiveWhatsAppText(
            ticket,
            ticket.contact,
            text,
            "REENGAGEMENT"
          );
          if (!ok) continue;

          const daily = bumpProactiveDailyCount(st);
          await ticket.update({
            dataWebhook: mergeAgentProactiveState(ticket, {
              lastReengagementAt: new Date().toISOString(),
              reengagementAttempts: (st.reengagementAttempts || 0) + 1,
              ...daily
            })
          });

          await sendProactiveContextMediaAfterText(
            ticket.contactId,
            "reengagement",
            settings,
            ticket.id
          );
        } catch (e) {
          logger.error(`[REENGAGEMENT] Erro ticket ${ticket.id}:`, e);
        }
        await sleep(delayMs);
      }
    } catch (e) {
      logger.error(`[REENGAGEMENT] Erro company ${companyId}:`, e);
    }
  }
  logger.info("[REENGAGEMENT] Job concluído");
}
