/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowEngineV2Runtime — adapter de runtime (PR 5).
 *
 * Plugagem do `AttendanceFlowDecisionEngine` (puro) + classifier + hook bus
 * no fluxo de mensagens do WhatsApp.
 *
 * Comportamento:
 *  - Atrás de feature flag `ATTENDANCE_FLOW_ENGINE_V2_ENABLED`.
 *  - Tenta carregar IR compilado + flowUnderstanding do banco (`AttendanceFlowDefinition`
 *    + colunas IR de `AttendanceFlowStep`). Se ausentes, recompila on-the-fly do roteiro
 *    cru — nunca quebra.
 *  - Classifica o turno (heurística por default; LLM se autoflag ligado).
 *  - Aplica a decisão (`decideAttendanceFlowTurn`):
 *      - present_step → reaproveita `presentStepWithScriptCommands` (V1) para manter
 *        compat com `/comandos` inline e mídia.
 *      - send_hint    → envia 1 bolha de texto curta.
 *      - complete_flow→ marca `flowPhase=completed` e dispara on_exit/on_flow_complete.
 *      - noop         → não faz nada, devolve false (LLM clássico assume).
 *  - Dispara hooks via `HookTriggerBus` (após persistir memory).
 *  - Loga timeline event estruturado (PR 7).
 *
 * Devolve `handled: true` quando consumiu o turno (caller pula LLM).
 */

import path from "path";
import { proto } from "baileys";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import TicketTraking from "../../models/TicketTraking";
import Prompt from "../../models/Prompt";
import Message from "../../models/Message";
import AttendanceFlowDefinition from "../../models/AttendanceFlowDefinition";
import AttendanceFlowStep from "../../models/AttendanceFlowStep";
import { resolveReplyJid } from "../WbotServices/getJidOf";
import logger from "../../utils/logger";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import {
  normalizeAttendanceFlowMemory,
  type AttendanceFlowMemory
} from "../../helpers/agentAttendanceFlowMemory";
import { loadRuntimeFlowStepsForAgent } from "../../helpers/loadRuntimeFlowStepsForAgent";
import { hydrateAttendanceFlowIRFromRows } from "../../helpers/hydrateAttendanceFlowIR";
import {
  decideAttendanceFlowTurn,
  isFlowEngineV2Enabled
} from "./AttendanceFlowDecisionEngine";
import { classifyAttendanceFlowTurn } from "./AttendanceFlowClassifierService";
import { triggerHook } from "./HookTriggerBus";
import {
  appendTimelineEvent,
  buildTimelineEventFromDecision,
  logTimelineEvent
} from "./AttendanceFlowAuditService";
import { presentStepWithScriptCommands } from "./presentStepWithScriptCommands";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  isAgentOutboundGuardEnabled,
  recordSentOutbound,
  shouldSendOutbound
} from "./AgentOutboundGuard";
import {
  applyAgentOrchestratorGuardrails,
  splitAgentReplyIntoSmartBlocks
} from "./AgentOrchestratorService";
import { AGENT_OUTBOUND_BUBBLE_DELAY_MS, AGENT_OUTBOUND_BUBBLE_MAX_CHARS } from "../../config/openAiDefaults";

type Session = any;

export type FlowEngineV2HandleResult = {
  handled: boolean;
  consumedReply: boolean;
  sentCount: number;
  actionCount: number;
  allowLlmFallback: boolean;
  source: "v2" | "v2_fallback_to_v1";
  reason?: string;
};

function flowV2Fallback(reason: string): FlowEngineV2HandleResult {
  return {
    handled: false,
    consumedReply: false,
    sentCount: 0,
    actionCount: 0,
    allowLlmFallback: false,
    source: "v2_fallback_to_v1",
    reason
  };
}

async function loadDefinition(promptId: number, companyId: number) {
  try {
    return await AttendanceFlowDefinition.findOne({
      where: { promptId, companyId }
    });
  } catch (e) {
    logger.warn(`[FLOW-V2] loadDefinition prompt=${promptId} falhou`, e);
    return null;
  }
}

async function loadStepRows(promptId: number, companyId: number) {
  try {
    return await AttendanceFlowStep.findAll({
      where: { promptId, companyId },
      order: [["stepNumber", "ASC"]]
    });
  } catch (e) {
    logger.warn(`[FLOW-V2] loadStepRows prompt=${promptId} falhou`, e);
    return [];
  }
}

async function persistMemory(
  ticket: Ticket,
  promptId: number,
  patch: Partial<AttendanceFlowMemory>,
  timelineEvent?: any
): Promise<AttendanceFlowMemory> {
  const row = await Ticket.findByPk(ticket.id, { attributes: ["dataWebhook"] });
  const base = normalizeTicketDataWebhook(row?.getDataValue("dataWebhook")) as Record<string, any>;
  const prev = normalizeAttendanceFlowMemory(base.attendanceFlow, promptId);
  const next: AttendanceFlowMemory = {
    ...prev,
    ...patch,
    promptId,
    /**
     * answersByStep no patch do decision engine sempre vem como SET COMPLETO
     * (advance: prev + nova resposta; correction: prev sem as etapas posteriores).
     * Replace, NÃO merge — senão a correção retroativa quebra.
     */
    answersByStep:
      patch.answersByStep !== undefined
        ? { ...patch.answersByStep }
        : { ...(prev.answersByStep || {}) },
    completedSteps:
      patch.completedSteps !== undefined ? patch.completedSteps : prev.completedSteps,
    firedHookKeys: patch.firedHookKeys !== undefined ? patch.firedHookKeys : prev.firedHookKeys
  };
  const timeline = timelineEvent
    ? appendTimelineEvent(base.attendanceFlowTimeline, timelineEvent)
    : base.attendanceFlowTimeline;
  const nextDw: Record<string, any> = {
    ...base,
    attendanceFlow: next,
    ...(timelineEvent ? { attendanceFlowTimeline: timeline } : {})
  };
  await ticket.update({ dataWebhook: nextDw as any });
  ticket.setDataValue("dataWebhook", nextDw);
  return next;
}

async function sendSimpleText(args: {
  text: string;
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: TicketTraking;
  verifyMessage: any;
}): Promise<number> {
  const clean = applyAgentOrchestratorGuardrails(
    sanitizeAgentCustomerVisibleText(String(args.text || "")),
    { actionConfirmed: false }
  );
  if (!clean) return 0;
  let sentCount = 0;
  for (const block of splitAgentReplyIntoSmartBlocks(clean, {
    maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
    maxBlocks: 12
  })) {
    if (isAgentOutboundGuardEnabled()) {
      const guard = shouldSendOutbound(block, args.ticket, null);
      if (!guard.send) {
        logger.info(`[OUTBOUND-GUARD] bloqueando flow-v2 duplicado (${guard.reason}) ticket=${args.ticket.id}`);
        continue;
      }
    }
    const sent = await args.wbot.sendMessage(resolveReplyJid(args.msg, args.contact), { text: `\u200e ${block}` });
    try {
      await args.verifyMessage(sent!, args.ticket, args.contact, args.ticketTraking, true, false, true);
      sentCount += 1;
      if (isAgentOutboundGuardEnabled()) {
        await recordSentOutbound(block, args.ticket, null);
      }
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => setTimeout(resolve, AGENT_OUTBOUND_BUBBLE_DELAY_MS));
  }
  return sentCount;
}

export async function tryHandleAttendanceFlowTurnV2(params: {
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: TicketTraking;
  prompt: Prompt;
  fullPrompt: any;
  bodyMessage: string;
}): Promise<FlowEngineV2HandleResult> {
  const { wbot, msg, ticket, contact, ticketTraking, prompt, fullPrompt, bodyMessage } = params;

  if (msg?.key?.fromMe) return flowV2Fallback("outbound");

  if (!isFlowEngineV2Enabled()) {
    return flowV2Fallback("flag_off");
  }

  /** 1) carregar dados — falhas levam ao V1. */
  const [stepRows, definitionRow] = await Promise.all([
    loadStepRows(prompt.id, ticket.companyId),
    loadDefinition(prompt.id, ticket.companyId)
  ]);

  const runtimeRows = await loadRuntimeFlowStepsForAgent({
    fullPrompt,
    promptId: prompt.id,
    companyId: ticket.companyId
  });

  if (!runtimeRows.length) {
    return flowV2Fallback("no_steps");
  }

  const definitionJson = definitionRow ? definitionRow.toJSON() : null;
  const smartActionsRaw: any[] =
    Array.isArray(fullPrompt?.smartActions) ? fullPrompt.smartActions :
    Array.isArray(fullPrompt?.promptSmartActions) ? fullPrompt.promptSmartActions :
    [];

  const { steps, definition } = hydrateAttendanceFlowIRFromRows({
    stepRows: runtimeRows,
    definitionRow: definitionJson,
    smartActions: smartActionsRaw.map((a) => ({
      id: Number(a.id),
      slug: a.slug || a.scriptSlug || null,
      type: a.type || null,
      name: a.name || null
    }))
  });

  /** 2) memory atual. */
  const dwNow = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
  let memory = normalizeAttendanceFlowMemory(dwNow.attendanceFlow, prompt.id);
  if (Number(memory.promptId) !== Number(prompt.id)) {
    memory = normalizeAttendanceFlowMemory(
      { promptId: prompt.id, lastPresentedStep: 0, lastHandledUserWid: "", flowPhase: "active" },
      prompt.id
    );
  }
  if (memory.flowPhase === "completed") {
    return flowV2Fallback("flow_completed");
  }
  const inboundWid = String(msg?.key?.id || "").trim();
  if (inboundWid && String(memory.lastHandledUserWid || "") === inboundWid) {
    return {
      handled: false,
      consumedReply: true,
      sentCount: 0,
      actionCount: 0,
      allowLlmFallback: true,
      source: "v2",
      reason: "dedup_inbound"
    };
  }
  let sentCount = 0;
  let actionCount = 0;

  /** 3) classifier. */
  const currentStepNumber = Number(memory.lastPresentedStep) || 0;
  const currentStep =
    steps.find((s) => s.stepNumber === currentStepNumber) || steps[0];

  let classifier;
  try {
    let conversationHistory: any[] = [];
    try {
      const recentMessages = await Message.findAll({
        where: { ticketId: ticket.id },
        order: [["createdAt", "DESC"]],
        limit: 8
      });
      conversationHistory = recentMessages
        .reverse()
        .map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          text: String(m.body || "")
        }))
        .filter((m: any) => m.text.trim());
    } catch {
      conversationHistory = [];
    }
    classifier = await classifyAttendanceFlowTurn({
      userText: bodyMessage,
      currentStep,
      understanding: ((definitionJson as any)?.flowUnderstanding as any) || null,
      answersByStep: memory.answersByStep,
      conversationHistory,
      apiKey: (prompt as any).apiKey || null,
      model: (prompt as any).model || undefined,
      mode: "auto",
      llmFallbackThreshold: 0.86
    });
  } catch (e) {
    logger.warn(`[FLOW-V2] classifier falhou — fallback V1`, e);
    return flowV2Fallback("classifier_error");
  }

  /** 4) decisão pura. */
  const decision = decideAttendanceFlowTurn({
    memory,
    classifier,
    steps,
    definition,
    currentStepNumber,
    userText: bodyMessage
  });

  /** 5) timeline. */
  const timelineEvent = buildTimelineEventFromDecision({
    ticketId: ticket.id,
    promptId: prompt.id,
    audit: decision.audit,
    matchedBranch: classifier.matchedBranch,
    hookFires: decision.hookFires
  });
  logTimelineEvent(timelineEvent);

  /** 6) persistir memory parcial ANTES de IO (exceto defer_to_llm — LLM assume sem alterar estado). */
  if (
    decision.action !== "defer_to_llm" &&
    (Object.keys(decision.memoryPatch).length || decision.action !== "noop")
  ) {
    const patch = {
      ...decision.memoryPatch,
      lastHandledUserWid: inboundWid || memory.lastHandledUserWid,
      lastUserInboundAt: new Date().toISOString()
    };
    memory = await persistMemory(ticket, prompt.id, patch, timelineEvent);
  }

  const { verifyMessage, verifyMediaMessage, transferQueue } = await import(
    "../WbotServices/wbotMessageListener"
  );

  /** 7) IO conforme decisão. */
  switch (decision.action) {
    case "present_step": {
      if (!decision.presentStep) break;
      try {
        const scriptMeta = await presentStepWithScriptCommands({
          stepText: decision.presentStep.agentPrompt,
          stepAttachments: (decision.presentStep as any).attachments || [],
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          prompt: fullPrompt,
          verifyMessage,
          verifyMediaMessage,
          sendStepTextBlocks: async (vm: any, w: any, m: any, t: any, c: any, tt: any, text: string) => {
            const clean = applyAgentOrchestratorGuardrails(
              sanitizeAgentCustomerVisibleText(String(text || "")),
              { actionConfirmed: false }
            );
            if (!clean) return;
            for (const block of splitAgentReplyIntoSmartBlocks(clean, {
              maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
              maxBlocks: 12
            })) {
              if (isAgentOutboundGuardEnabled()) {
                const guard = shouldSendOutbound(block, t, null);
                if (!guard.send) {
                  logger.info(`[OUTBOUND-GUARD] bloqueando flow-v2 step duplicado (${guard.reason}) ticket=${t.id}`);
                  continue;
                }
              }
              const sent = await w.sendMessage(resolveReplyJid(m, c), { text: `\u200e ${block}` });
              sentCount += 1;
              try {
                await vm(sent!, t, c, tt, true, false, true);
                if (isAgentOutboundGuardEnabled()) {
                  await recordSentOutbound(block, t, null);
                }
              } catch {
                /* ignore */
              }
              await new Promise((resolve) => setTimeout(resolve, AGENT_OUTBOUND_BUBBLE_DELAY_MS));
            }
          },
          transferQueue,
          deferAgendamentoUntilReply: true,
          attendanceFlowStep: decision.presentStep.stepNumber
        });
        const stepKey = String(decision.presentStep.stepNumber);
        const executedScriptCommands = { ...(memory.executedScriptCommands || {}) };
        const existing = executedScriptCommands[stepKey] || [];
        const marks = (scriptMeta.executedCommands || []).map((cmd) =>
          cmd.kind === "action" ? `/${cmd.slug}` : `@media:${cmd.slug}`
        );
        executedScriptCommands[stepKey] = [...new Set([...existing, ...marks])];

        const deferredScriptActions = { ...(memory.deferredScriptActions || {}) };
        const incomingDeferred = scriptMeta.deferredActions || [];
        if (incomingDeferred.length) {
          deferredScriptActions[stepKey] = [
            ...(deferredScriptActions[stepKey] || []),
            ...incomingDeferred
          ];
        }

        memory = await persistMemory(ticket, prompt.id, {
          lastPresentedStep: decision.presentStep.stepNumber,
          awaitingUserReply: true,
          lastStepPresentedAt: new Date().toISOString(),
          lastPresentedTextPreview: String(decision.presentStep.agentPrompt || "").slice(0, 220),
          executedScriptCommands,
          ...(incomingDeferred.length ? { deferredScriptActions } : {})
        });
      } catch (e) {
        logger.error(`[FLOW-V2] present_step falhou ticket=${ticket.id}`, e);
      }
      break;
    }
    case "send_hint": {
      if (decision.hintText) {
        sentCount += await sendSimpleText({
          text: decision.hintText,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          verifyMessage
        });
      }
      break;
    }
    case "defer_to_llm":
      return {
        handled: false,
        consumedReply: false,
        sentCount: 0,
        actionCount: 0,
        allowLlmFallback: true,
        source: "v2",
        reason: "defer_to_llm"
      };
    case "complete_flow":
      /** Nada a enviar — caller pode dispatchar transfer/agendamento via hook. */
      break;
    case "noop":
    default:
      break;
  }

  /** 8) hooks (após IO de step, para coincidir com momentos reais). */
  const transitionHooks =
    Array.isArray(definition.transitionHooks) ? (definition.transitionHooks as any[]) : [];
  for (const fire of decision.hookFires) {
    try {
      const fromStepObj = fire.fromStepId
        ? steps.find((s) => s.stepId === fire.fromStepId) || null
        : null;
      const toStepObj = fire.toStepId
        ? steps.find((s) => s.stepId === fire.toStepId) || null
        : null;
      const r = await triggerHook({
        moment: fire.moment,
        step: fire.step,
        fromStep: fromStepObj,
        toStep: toStepObj,
        transitionHooks,
        matched: fire.matched,
        isCorrection: fire.corrected,
        memory,
        context: {
          prompt: fullPrompt,
          ticket,
          contact
        }
      });
      actionCount += (r.results || []).filter((item: any) => item?.success && !item?.skipped).length;
      if (r.memoryPatch && Object.keys(r.memoryPatch).length) {
        memory = await persistMemory(ticket, prompt.id, r.memoryPatch as any);
      }
    } catch (e) {
      logger.warn(`[FLOW-V2] hook ${fire.moment} ${fire.step.stepId} falhou`, e);
    }
  }

  const hasRuntimeOutput = sentCount > 0 || actionCount > 0;
  const allowLlmFallback = decision.consumedReply && !hasRuntimeOutput;
  return {
    handled: decision.consumedReply && hasRuntimeOutput,
    consumedReply: decision.consumedReply,
    sentCount,
    actionCount,
    allowLlmFallback,
    source: "v2",
    reason: allowLlmFallback ? `silent_${decision.action}` : decision.action
  };
}

/** Resolve módulo do path do `public` (placeholder caso seja preciso futuramente). */
export const __PUBLIC_PATH__ = path.resolve(__dirname, "..", "..", "..", "public");
