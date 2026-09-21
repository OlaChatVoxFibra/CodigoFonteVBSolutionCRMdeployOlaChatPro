/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import GetWhatsappWbot from "../../helpers/GetWhatsappWbot";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import {
  resolveConnectionAgentFromWhatsapp,
  syntheticPromptIdForAnthropicAgent
} from "../../providers/anthropic/services/resolveConnectionAgent";
import { syncTicketConnectionAgentContext } from "../../helpers/syncTicketConnectionAgentContext";
import {
  runAgentOrchestrator,
  runProviderDirectReplyFallback,
  splitAgentReplyIntoSmartBlocks
} from "./AgentOrchestratorService";
import { sendGeminiImagesToWhatsapp } from "../../providers/gemini/agents/geminiWhatsappMedia";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  isAgentOutboundGuardEnabled,
  recordSentOutbound,
  shouldSendOutbound
} from "./AgentOutboundGuard";
import {
  classifyAgentOutbound,
  registerPendingIntents,
  shouldRunSmartActionTriggersForPrompt,
  filterIntentsToEnabledSmartActions
} from "./IntentTriggerEngine";
import { resolvePendingIntents } from "./PendingIntentResolver";
import { tryHandlePromptAttendanceFlowTurn } from "./AttendanceFlowTurnService";
import { markAgentProcessingFinished, markAgentProcessingStarted } from "./AgentProcessingStateService";
import {
  sendInventoryReplyMedia,
  tryHandleInventoryProductInbound
} from "../../helpers/agentInventoryRuntime";
import type { AgentInboundJobData } from "./AgentInboundQueueService";
import { AGENT_OUTBOUND_BUBBLE_DELAY_MS, AGENT_OUTBOUND_BUBBLE_MAX_CHARS } from "../../config/openAiDefaults";
import { deliverTelegramAgentReply } from "../TelegramServices/deliverTelegramAgentReply";
import { deliverLinkedInAgentReply } from "../LinkedInServices/deliverLinkedInAgentReply";

async function deliverOrchestratorReply(params: {
  wbot?: any;
  remoteJid?: string;
  ticket: any;
  contact: any;
  prompt: any;
  text: string;
  userText: string;
  retryDepth?: number;
  channel?: string;
  connection?: Whatsapp;
}): Promise<number> {
  if (params.channel === "linkedin" && params.connection) {
    return deliverLinkedInAgentReply({
      connection: params.connection,
      ticket: params.ticket,
      contact: params.contact,
      prompt: params.prompt,
      text: params.text
    });
  }

  if (
    (params.channel === "telegram" || params.channel === "telegram_oficial") &&
    params.connection
  ) {
    return deliverTelegramAgentReply({
      connection: params.connection,
      ticket: params.ticket,
      contact: params.contact,
      prompt: params.prompt,
      text: params.text
    });
  }

  const wbot = params.wbot;
  const remoteJid = String(params.remoteJid || "").trim();
  if (!wbot || !remoteJid) return 0;
  const depth = Number(params.retryDepth || 0);
  const { verifyMessage } = await import("../WbotServices/wbotMessageListener");

  const blocks = splitAgentReplyIntoSmartBlocks(params.text, {
    maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
    maxBlocks: 12
  });
  let sent = 0;
  let blocked = 0;
  const blockedReasons: string[] = [];

  for (const block of blocks) {
    const safeBlock = sanitizeAgentCustomerVisibleText(block);
    if (!safeBlock) continue;
    if (isAgentOutboundGuardEnabled()) {
      const guard = shouldSendOutbound(safeBlock, params.ticket, params.prompt.id);
      if (!guard.send) {
        blocked += 1;
        blockedReasons.push(guard.reason || "blocked");
        logger.info(`[AGENT-INBOUND-QUEUE] outbound guard (${guard.reason}) ticket=${params.ticket.id}`);
        continue;
      }
    }
    const sentMessage = await params.wbot.sendMessage(params.remoteJid, {
      text: `\u200e ${safeBlock}`
    });
    await verifyMessage(sentMessage!, params.ticket, params.contact, undefined, true, false, true);
    if (isAgentOutboundGuardEnabled()) {
      await recordSentOutbound(safeBlock, params.ticket, params.prompt.id);
    }
    sent += 1;
    if (blocks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, AGENT_OUTBOUND_BUBBLE_DELAY_MS));
    }
  }

  if (sent === 0 && blocked > 0 && params.userText && depth < 1) {
    const reprocessed = await runAgentOrchestrator({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      userText: params.userText,
      blockedOutboundContext: {
        blockedReply: params.text,
        reasons: [...new Set(blockedReasons)]
      }
    });
    const llmReply = sanitizeAgentCustomerVisibleText(String(reprocessed.reply || ""));
    if (reprocessed.handled && llmReply) {
      return deliverOrchestratorReply({
        ...params,
        text: llmReply,
        retryDepth: depth + 1
      });
    }
  }

  return sent;
}

/**
 * Bull worker for `AgentInboundMessage` — executa o mesmo núcleo LLM-first do `handleOpenAi`
 * (orquestrador + envio + intents), após o listener ter atualizado memória conversacional e
 * enfileirado o job (dedupe por `jobId` / `wid`).
 */
export async function handleAgentInboundMessage(job: { id?: string | number; data: AgentInboundJobData }) {
  const d = job?.data;
  if (
    !d ||
    typeof d.ticketId !== "number" ||
    typeof d.companyId !== "number" ||
    typeof d.promptId !== "number" ||
    typeof d.contactId !== "number" ||
    typeof d.userText !== "string"
  ) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} ignorado: payload invalido`);
    return;
  }

  const userText = String(d.userText || "").trim();
  if (!userText) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} ticket=${d.ticketId} sem userText`);
    return;
  }

  let ticket: any;
  try {
    ticket = await ShowTicketService(d.ticketId, d.companyId);
  } catch {
    ticket = null;
  }
  if (!ticket) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} ticket=${d.ticketId} nao encontrado`);
    return;
  }

  if (ticket.status === "closed" || ticket.status === "nps") {
    logger.info(
      `[AGENT-INBOUND-QUEUE] job=${job?.id} ticket=${d.ticketId} status=${ticket.status}; ignorando`
    );
    return;
  }

  const contact = ticket.contact;
  if (!contact || Number(contact.id) !== Number(d.contactId)) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} contact inconsistente ticket=${d.ticketId}`);
    return;
  }
  if (contact.disableBot) {
    logger.info(`[AGENT-INBOUND-QUEUE] job=${job?.id} contact=${contact.id} disableBot; ignorando`);
    return;
  }

  const jobChannel = String(d.channel || ticket.channel || "whatsapp").toLowerCase();
  const isTelegram =
    jobChannel === "telegram" || jobChannel === "telegram_oficial";
  const isLinkedIn = jobChannel === "linkedin";
  const isAlternateMessaging = isTelegram || isLinkedIn;

  const remoteJid = String(contact.remoteJid || "").trim();
  if (!isAlternateMessaging && !remoteJid) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} sem remoteJid contact=${contact.id}`);
    return;
  }

  const wa = await Whatsapp.findOne({ where: { id: d.whatsappId, companyId: d.companyId } });
  if (!wa) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} whatsapp=${d.whatsappId} nao encontrado`);
    return;
  }

  let prompt: any;
  let connectionRef: import("../../providers/anthropic/services/resolveConnectionAgent").ConnectionAgentRef;
  try {
    const whatsappConn = await ShowWhatsAppService(Number(wa.id), d.companyId);
    const resolved = await resolveConnectionAgentFromWhatsapp(whatsappConn, d.companyId);
    if (!resolved) {
      logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} conexao sem agente`);
      return;
    }
    prompt = resolved.prompt;
    connectionRef = resolved.ref;
    const linkedPromptId =
      connectionRef.kind === "anthropic"
        ? syntheticPromptIdForAnthropicAgent(connectionRef.anthropicMultiAgentId)
        : connectionRef.promptId;
    if (Number(linkedPromptId) !== Number(d.promptId)) {
      logger.warn(
        `[AGENT-INBOUND-QUEUE] job=${job?.id} prompt da conexao (${linkedPromptId}) != job (${d.promptId}); abortando`
      );
      return;
    }
  } catch (e: any) {
    logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} falha ao resolver agente: ${e?.message || e}`);
    return;
  }

  let wbot: any = null;
  if (!isAlternateMessaging) {
    try {
      wbot = await GetWhatsappWbot(wa);
    } catch (e: any) {
      logger.warn(`[AGENT-INBOUND-QUEUE] job=${job?.id} sem sessao wbot: ${e?.message || e}`);
      await markAgentProcessingFinished({
        ticket,
        promptId: prompt.id,
        wid: d.wid || null,
        ok: false,
        error: e
      });
      return;
    }
  }

  await syncTicketConnectionAgentContext(ticket, connectionRef);

  await markAgentProcessingStarted({
    ticket,
    promptId: prompt.id,
    wid: d.wid || null,
    userText
  });

  const queueStubMsg = {
    key: { remoteJid: remoteJid || `${contact.number}@telegram`, id: String(d.wid || ""), fromMe: false }
  } as any;

  const deliverParams = {
    channel: isAlternateMessaging ? jobChannel : "whatsapp",
    connection: isAlternateMessaging ? wa : undefined,
    wbot: isAlternateMessaging ? undefined : wbot,
    remoteJid: isAlternateMessaging ? undefined : remoteJid,
    ticket,
    contact,
    prompt
  };

  try {
    if (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) {
      try {
        const r = await resolvePendingIntents(ticket, contact, prompt, userText);
        if (r.handled) {
          const safeIntentMessage = sanitizeAgentCustomerVisibleText(String(r.message || ""));
          if (safeIntentMessage) {
            await deliverOrchestratorReply({
              ...deliverParams,
              text: safeIntentMessage,
              userText
            });
          }
          try {
            await ticket.reload();
          } catch {
            /* ignore */
          }
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: d.wid || null,
            ok: true
          });
          return;
        }
      } catch (e) {
        logger.warn(`[AGENT-INBOUND-QUEUE] intent resolver ticket=${ticket.id}:`, e as any);
      }
    }

    try {
      const inv = await tryHandleInventoryProductInbound({
        companyId: ticket.companyId,
        prompt,
        ticket,
        userText
      });
      if (inv.handled) {
        const safeInvMessage = sanitizeAgentCustomerVisibleText(String(inv.message || ""));
        if (safeInvMessage) {
          await deliverOrchestratorReply({
            ...deliverParams,
            text: safeInvMessage,
            userText
          });
        }
        if (inv.product && inv.reply) {
          try {
            await sendInventoryReplyMedia({
              ticket,
              product: inv.product,
              reply: inv.reply
            });
          } catch (mediaErr) {
            logger.warn(
              `[AGENT-INBOUND-QUEUE] inventory media ticket=${ticket.id}:`,
              mediaErr as any
            );
          }
        }
        try {
          await ticket.reload();
        } catch {
          /* ignore */
        }
        await markAgentProcessingFinished({
          ticket,
          promptId: prompt.id,
          wid: d.wid || null,
          ok: true
        });
        return;
      }
    } catch (e) {
      logger.warn(`[AGENT-INBOUND-QUEUE] inventory inbound ticket=${ticket.id}:`, e as any);
    }

    if (!isAlternateMessaging && wbot) {
      try {
        const flowEarly = await tryHandlePromptAttendanceFlowTurn({
          wbot,
          msg: queueStubMsg,
          ticket,
          contact,
          ticketTraking: undefined,
          prompt,
          bodyMessage: userText
        });
        if (flowEarly.handled && (flowEarly.sentCount > 0 || flowEarly.actionCount > 0)) {
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: d.wid || null,
            ok: true
          });
          return;
        }
        if (flowEarly.consumedReply && flowEarly.allowLlmFallback) {
          logger.warn(
            `[AGENT-INBOUND-QUEUE] ticket ${ticket.id}: fluxo consumiu sem saída (${flowEarly.reason}); seguindo para orquestrador.`
          );
        }
        try {
          await ticket.reload();
        } catch {
          /* ignore */
        }
      } catch (e) {
        logger.warn(`[AGENT-INBOUND-QUEUE] attendance flow ticket=${ticket.id}:`, e as any);
      }
    }

    const orchestrated = await runAgentOrchestrator({
      prompt,
      ticket,
      contact,
      userText
    });

    if (orchestrated.handled) {
      const reply = sanitizeAgentCustomerVisibleText(String(orchestrated.reply || ""));
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
            logger.warn(`[AGENT-INBOUND-QUEUE] intent classifier ticket=${ticket.id}:`, e as any);
          }
        }
        await deliverOrchestratorReply({
          ...deliverParams,
          text: reply,
          userText
        });
      }
      if (
        (prompt as any).__llmProvider === "gemini" &&
        orchestrated.geminiImages?.length &&
        wbot &&
        !isTelegram
      ) {
        await sendGeminiImagesToWhatsapp({
          wbot,
          msg: queueStubMsg,
          ticket,
          contact,
          companyId: ticket.companyId,
          images: orchestrated.geminiImages,
          caption: reply || undefined
        });
      }
      await markAgentProcessingFinished({
        ticket,
        promptId: prompt.id,
        wid: d.wid || null,
        ok: true
      });
      return;
    }

    if (orchestrated.fallbackReason) {
      logger.info(`[AGENT-INBOUND-QUEUE] orchestrator nao assumiu ticket=${ticket.id} reason=${orchestrated.fallbackReason}`);
    }

    if (
      (prompt as any).__llmProvider === "gemini" ||
      (prompt as any).__llmProvider === "anthropic" ||
      (prompt as any).__llmProvider === "grok"
    ) {
      const direct = await runProviderDirectReplyFallback({
        prompt,
        ticket,
        contact,
        userText
      });
      if (direct.handled) {
        const directReply = sanitizeAgentCustomerVisibleText(String(direct.reply || ""));
        if (directReply) {
          await deliverOrchestratorReply({
            ...deliverParams,
            text: directReply,
            userText
          });
        }
        if (direct.geminiImages?.length && wbot && !isTelegram) {
          await sendGeminiImagesToWhatsapp({
            wbot,
            msg: queueStubMsg,
            ticket,
            contact,
            companyId: ticket.companyId,
            images: direct.geminiImages,
            caption: directReply || undefined
          });
        }
      }
    }

    await markAgentProcessingFinished({
      ticket,
      promptId: prompt.id,
      wid: d.wid || null,
      ok: true
    });
  } catch (e: any) {
    await markAgentProcessingFinished({
      ticket,
      promptId: prompt.id,
      wid: d.wid || null,
      ok: false,
      error: e
    });
    logger.warn(`[AGENT-INBOUND-QUEUE] erro ticket=${ticket.id}: ${e?.message || e}`);
  }
}
