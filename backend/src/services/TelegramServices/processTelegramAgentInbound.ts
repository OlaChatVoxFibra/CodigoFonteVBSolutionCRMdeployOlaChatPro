/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { resolvePromptWithLlmProvider } from "../../providers/anthropic/services/resolveConnectionAgent";
import { onAgentUserInboundText } from "../AgentProactiveServices/onUserInboundAgent";
import { syncTicketConnectionAiContext } from "../../helpers/syncTicketConnectionAiContext";
import { updateAgentConversationalMemory } from "../../helpers/agentConversationalMemory";
import {
  enqueueAgentInboundJob,
  isAgentInboundQueueEnabled
} from "../PromptServices/AgentInboundQueueService";
import { agentInboundQueue } from "../../queues";
import {
  isAgentLlmFirstRuntimeEnabled,
  runAgentOrchestrator,
  runProviderDirectReplyFallback
} from "../PromptServices/AgentOrchestratorService";
import {
  markAgentProcessingFinished,
  markAgentProcessingStarted
} from "../PromptServices/AgentProcessingStateService";
import {
  classifyAgentOutbound,
  filterIntentsToEnabledSmartActions,
  registerPendingIntents,
  shouldRunSmartActionTriggersForPrompt
} from "../PromptServices/IntentTriggerEngine";
import { resolvePendingIntents } from "../PromptServices/PendingIntentResolver";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import { deliverTelegramAgentReply } from "./deliverTelegramAgentReply";
import logger from "../../utils/logger";

/**
 * Dispara o agente de IA (prompt da conexão) para mensagens inbound do Telegram.
 */
export async function processTelegramAgentInbound(params: {
  connection: Whatsapp;
  ticket: Ticket;
  contact: Contact;
  body: string;
  messageWid: string;
}): Promise<void> {
  const { connection, ticket, contact, body, messageWid } = params;
  const bodyMessage = String(body || "").trim();
  if (!bodyMessage) return;
  if (contact.disableBot) return;

  let whatsappConn: Whatsapp;
  try {
    whatsappConn = await ShowWhatsAppService(connection.id, ticket.companyId);
  } catch {
    return;
  }

  if (whatsappConn.agentDisabled === true) return;

  const linkedPromptId = whatsappConn.getDataValue("promptId") as
    | number
    | null
    | undefined;
  if (
    linkedPromptId == null ||
    String(linkedPromptId).trim() === "" ||
    Number.isNaN(Number(linkedPromptId))
  ) {
    return;
  }

  let prompt: any;
  try {
    const resolved = await resolvePromptWithLlmProvider(ticket.companyId, Number(linkedPromptId));
    prompt = resolved.prompt;
  } catch {
    return;
  }
  if (!prompt) return;

  try {
    await onAgentUserInboundText(ticket, bodyMessage);
  } catch {
    /* ignore */
  }

  await syncTicketConnectionAiContext(ticket, prompt.id);

  try {
    await updateAgentConversationalMemory({
      ticket,
      promptId: prompt.id,
      userText: bodyMessage
    });
  } catch (e) {
    logger.warn(
      `[TELEGRAM-AGENT] memória conversacional ticket=${ticket.id}:`,
      e as any
    );
  }

  if (
    isAgentInboundQueueEnabled() &&
    agentInboundQueue &&
    isAgentLlmFirstRuntimeEnabled() &&
    messageWid
  ) {
    const queued = await enqueueAgentInboundJob(agentInboundQueue, {
      companyId: ticket.companyId,
      ticketId: ticket.id,
      whatsappId: connection.id,
      promptId: prompt.id,
      wid: messageWid,
      enqueuedAt: new Date().toISOString(),
      userText: bodyMessage,
      contactId: contact.id,
      channel: String(connection.channel || ticket.channel || "telegram").toLowerCase()
    });
    if (queued) {
      logger.info(
        `[TELEGRAM-AGENT] enfileirado ticket=${ticket.id} wid=${messageWid}`
      );
      return;
    }
  }

  await markAgentProcessingStarted({
    ticket,
    promptId: prompt.id,
    wid: messageWid || null,
    userText: bodyMessage
  });

  try {
    if (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) {
      try {
        const r = await resolvePendingIntents(ticket, contact, prompt, bodyMessage);
        if (r.handled) {
          const safeIntentMessage = sanitizeAgentCustomerVisibleText(
            String(r.message || "")
          );
          if (safeIntentMessage) {
            await deliverTelegramAgentReply({
              connection: whatsappConn,
              ticket,
              contact,
              prompt,
              text: safeIntentMessage
            });
          }
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: messageWid || null,
            ok: true
          });
          return;
        }
      } catch (e) {
        logger.warn(`[TELEGRAM-AGENT] intents ticket=${ticket.id}:`, e as any);
      }
    }

    const orchestrated = await runAgentOrchestrator({
      prompt,
      ticket,
      contact,
      userText: bodyMessage
    });

    let reply = sanitizeAgentCustomerVisibleText(String(orchestrated.reply || ""));

    if (!reply && orchestrated.handled === false) {
      const direct = await runProviderDirectReplyFallback({
        prompt,
        ticket,
        contact,
        userText: bodyMessage
      });
      if (direct.handled) {
        reply = sanitizeAgentCustomerVisibleText(String(direct.reply || ""));
      }
    }

    if (reply) {
      if (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) {
        try {
          const cls = await classifyAgentOutbound(reply, prompt, ticket);
          const enabledIntents = await filterIntentsToEnabledSmartActions(
            cls.intents,
            prompt,
            ticket.companyId
          );
          if (enabledIntents.length) {
            await registerPendingIntents(ticket, enabledIntents);
          }
        } catch (e) {
          logger.warn(
            `[TELEGRAM-AGENT] classifier ticket=${ticket.id}:`,
            e as any
          );
        }
      }
      await deliverTelegramAgentReply({
        connection: whatsappConn,
        ticket,
        contact,
        prompt,
        text: reply
      });
    } else if (
      (prompt as any).__llmProvider === "gemini" ||
      (prompt as any).__llmProvider === "anthropic" ||
      (prompt as any).__llmProvider === "grok"
    ) {
      const direct = await runProviderDirectReplyFallback({
        prompt,
        ticket,
        contact,
        userText: bodyMessage
      });
      const directReply = sanitizeAgentCustomerVisibleText(String(direct.reply || ""));
      if (directReply) {
        await deliverTelegramAgentReply({
          connection: whatsappConn,
          ticket,
          contact,
          prompt,
          text: directReply
        });
      }
    }

    await markAgentProcessingFinished({
      ticket,
      promptId: prompt.id,
      wid: messageWid || null,
      ok: true
    });
  } catch (e: any) {
    await markAgentProcessingFinished({
      ticket,
      promptId: prompt.id,
      wid: messageWid || null,
      ok: false,
      error: e
    });
    logger.warn(
      `[TELEGRAM-AGENT] erro ticket=${ticket.id}: ${e?.message || e}`
    );
  }
}
