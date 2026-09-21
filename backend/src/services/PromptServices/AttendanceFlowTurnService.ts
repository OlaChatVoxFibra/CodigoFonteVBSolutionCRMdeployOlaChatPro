/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";
import { proto } from "baileys";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import TicketTraking from "../../models/TicketTraking";
import Prompt from "../../models/Prompt";
import ShowPromptService from "./ShowPromptService";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import { applyPromptIntegrationAgentTransfer } from "../IntegrationsServices/OpenAiService";
import CreateConvertedLeadService from "../ConvertedLeadServices/CreateService";
import { createScheduleFromFlowCustomerReply } from "../IntegrationsServices/OpenAiService";
import { resolveReplyJid } from "../WbotServices/getJidOf";
import logger from "../../utils/logger";
import { format } from "date-fns";
import { matchAttendanceFlowResponseOption } from "../../helpers/attendanceFlowMatchResponse";
import {
  presentStepWithScriptCommands,
  findPromptSmartActionRowByScriptSlug
} from "./presentStepWithScriptCommands";
import {
  findAgendamentoSlugInStepScript,
  findTransferSlugInStepScript,
  stepScriptMentionsAgendamentoCommand
} from "../../helpers/agentScriptInitialSendSlice";
import { executeSmartAction } from "./PromptSmartActionExecutorService";
import {
  normalizeAttendanceFlowMemory,
  shouldAdvanceOnFreeReply,
  isGreetingStyleStep,
  isGreetingStepAcceptableReply,
  customerVisibleStepEndsWithQuestionOrCommand,
  findDeferredAgendamentoIndex,
  findDeferredTransferIndex,
  bodyLooksLikeDateOrPeriodReply,
  looksLikePeriodWithoutExactDate,
  plausibleFreeReplyAdvancesStep,
  isTrivialFlowInboundNoise,
  looksLikePricingOrOffTopicVersusDateQuestion,
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply,
  type ScriptInboundTurnDecision,
  type AttendanceFlowMemory,
  type AttendanceFlowPhase,
  type DeferredScriptAction
} from "../../helpers/agentAttendanceFlowMemory";
import { parseDateTimeFromText } from "../../helpers/parseDateTimeFromText";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  assistantTextImpliesTransferToHuman,
  userRequestsHumanTransfer
} from "../../helpers/assistantTransferIntent";
import Message from "../../models/Message";
import { stripAgentFlowScriptTrainingMarkers } from "../../helpers/stripAgentFlowScriptTrainingMarkers";
import { clipPrematureAssistantProgressAfterQuestion } from "../../helpers/whatsappAssistantSingleTurnReply";
import { matchScriptCommandSlugFromLine } from "../../helpers/agentScriptInitialSendSlice";
import { loadRuntimeFlowStepsForAgent } from "../../helpers/loadRuntimeFlowStepsForAgent";
import { isAgentRoteiroRuntimeActive } from "../../helpers/agentRoteiroRuntime";
import { isFlowEngineV2Enabled } from "./AttendanceFlowDecisionEngine";
import { tryHandleAttendanceFlowTurnV2 } from "./AttendanceFlowEngineV2Runtime";
import {
  isAgentOutboundGuardEnabled,
  normalizeOutboundText,
  recordSentOutbound,
  shouldSendOutbound
} from "./AgentOutboundGuard";
import {
  applyAgentOrchestratorGuardrails,
  splitAgentReplyIntoSmartBlocks
} from "./AgentOrchestratorService";
import { AGENT_OUTBOUND_BUBBLE_DELAY_MS, AGENT_OUTBOUND_BUBBLE_MAX_CHARS } from "../../config/openAiDefaults";

type Session = any;

const FLOW_SENT_COUNTER_KEY = "__attendanceFlowRuntimeSentCount";
const FLOW_ACTION_COUNTER_KEY = "__attendanceFlowRuntimeActionCount";
const FLOW_LAST_OUTCOME_KEY = "__attendanceFlowLastOutcome";

export type FlowTurnOutcome = {
  handled: boolean;
  consumedReply: boolean;
  sentCount: number;
  actionCount: number;
  allowLlmFallback: boolean;
  source: "v1" | "v2" | "v1_fallback" | "v2_fallback_to_v1";
  reason?: string;
};

function runtimeCounter(ticket: Ticket, key: string): number {
  return Number((ticket as any)?.[key] || 0);
}

function bumpRuntimeCounter(ticket: Ticket, key: string, amount = 1): void {
  (ticket as any)[key] = runtimeCounter(ticket, key) + amount;
}

function getStepByNumber(steps: any[], stepNumber: number): any | undefined {
  return steps.find(s => Number(s.stepNumber) === Number(stepNumber));
}

function outboundBodyMatchesStepPreview(outboundBody: string, preview: string): boolean {
  const b = normalizeOutboundText(outboundBody);
  const needle = normalizeOutboundText(preview).slice(0, 80);
  if (!b || !needle) return false;
  if (b.includes(needle.slice(0, 36)) || needle.includes(b.slice(0, 36))) return true;
  const core = normalizeOutboundText(String(preview).split(/[?.!]/)[0] || preview).slice(0, 40);
  if (core.length >= 8 && b.includes(core)) return true;
  if (/\bfala\b/.test(needle) && /\btudo bem\b/.test(needle) && /\bfala\b/.test(b) && /\btudo bem\b/.test(b)) {
    return true;
  }
  return false;
}

async function recentAgentOutboundBodies(ticketId: number, limit = 12): Promise<string[]> {
  try {
    const recentOut = await Message.findAll({
      where: { ticketId, fromMe: true },
      order: [["createdAt", "DESC"]],
      limit,
      attributes: ["body"]
    });
    return recentOut.map((m) => String(m?.body || ""));
  } catch {
    return [];
  }
}

function parseAttachments(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function sendStepTextBlocks(
  verifyMessage: any,
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking | undefined,
  text: string,
  opts?: { forceFlowOutbound?: boolean }
): Promise<number> {
  let response = sanitizeAgentCustomerVisibleText(String(text || "").trim());
  if (!response) return 0;
  response = clipPrematureAssistantProgressAfterQuestion(response);
  response = applyAgentOrchestratorGuardrails(response, { actionConfirmed: false });

  const blocks = splitAgentReplyIntoSmartBlocks(response, {
    maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
    maxBlocks: 12
  });
  let sentCount = 0;
  for (const b of blocks) {
    if (!b.trim()) continue;
    if (isAgentOutboundGuardEnabled() && !opts?.forceFlowOutbound) {
      const guard = shouldSendOutbound(b, ticket, (ticket as any)?.promptId || null);
      if (!guard.send) {
        logger.info(`[OUTBOUND-GUARD] bloqueando roteiro duplicado (${guard.reason}) ticket=${ticket.id}`);
        continue;
      }
    }
    const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), { text: `\u200e ${b}` });
    await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
    sentCount += 1;
    bumpRuntimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
    if (isAgentOutboundGuardEnabled()) {
      await recordSentOutbound(b, ticket, (ticket as any)?.promptId || null);
    }
    await new Promise((r) => setTimeout(r, AGENT_OUTBOUND_BUBBLE_DELAY_MS));
  }
  return sentCount;
}

async function sendStepAttachments(
  verifyMediaMessage: any,
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking | undefined,
  companyId: number,
  attachments: any[]
): Promise<number> {
  const publicRoot = path.resolve(__dirname, "..", "..", "..", "public");
  const list = parseAttachments(attachments);
  let sentCount = 0;
  for (const att of list) {
    const url = String(att?.url || "").trim();
    if (!url) continue;
    const rel = url.startsWith("/") ? url.slice(1) : url;
    const fullPath = path.join(publicRoot, rel);
    if (!fs.existsSync(fullPath)) {
      logger.warn(`[ATTENDANCE-FLOW] Anexo ausente no disco: ${fullPath}`);
      continue;
    }
    const fileName = String(att.originalName || path.basename(fullPath)).slice(0, 380);
    try {
      const opts = await getMessageOptions(fileName, fullPath, String(companyId), " ");
      if (opts && Object.keys(opts).length) {
        const mediaMsg = await wbot.sendMessage(resolveReplyJid(msg, contact), { ...opts });
        await verifyMediaMessage(mediaMsg!, ticket, contact, ticketTraking!, false, false, wbot, true);
        sentCount += 1;
        bumpRuntimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (e) {
      logger.error(`[ATTENDANCE-FLOW] Falha ao enviar anexo:`, e);
    }
  }
  return sentCount;
}

/**
 * Executa um turno do fluxo de atendimento (prompt): apresenta passo / ramifica e envia mídias.
 * @returns resultado detalhado do turno. Só `handled=true` deve pular a LLM clássica.
 */
export async function tryHandlePromptAttendanceFlowTurn(params: {
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: TicketTraking;
  prompt: Prompt;
  bodyMessage: string;
}): Promise<FlowTurnOutcome> {
  const sentBase = runtimeCounter(params.ticket, FLOW_SENT_COUNTER_KEY);
  const actionBase = runtimeCounter(params.ticket, FLOW_ACTION_COUNTER_KEY);
  delete (params.ticket as any)[FLOW_LAST_OUTCOME_KEY];

  const legacyHandled = await tryHandlePromptAttendanceFlowTurnLegacy(params);
  const v2Outcome = (params.ticket as any)[FLOW_LAST_OUTCOME_KEY] as FlowTurnOutcome | undefined;
  if (v2Outcome) return v2Outcome;

  const sentCount = Math.max(0, runtimeCounter(params.ticket, FLOW_SENT_COUNTER_KEY) - sentBase);
  const actionCount = Math.max(0, runtimeCounter(params.ticket, FLOW_ACTION_COUNTER_KEY) - actionBase);
  const consumedReply = legacyHandled === true;
  const allowLlmFallback = consumedReply && sentCount === 0 && actionCount === 0;
  return {
    handled: consumedReply && !allowLlmFallback,
    consumedReply,
    sentCount,
    actionCount,
    allowLlmFallback,
    source: "v1",
    reason: allowLlmFallback ? "silent_v1" : consumedReply ? "v1_consumed" : "not_consumed"
  };
}

async function tryHandlePromptAttendanceFlowTurnLegacy(params: {
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: TicketTraking;
  prompt: Prompt;
  bodyMessage: string;
}): Promise<boolean> {
  const { wbot, msg, ticket, contact, ticketTraking, prompt, bodyMessage } = params;

  /** Só mensagem inbound do cliente pode consumir etapa / avançar roteiro. */
  if (msg?.key?.fromMe) {
    return false;
  }

  let fullPrompt: any;
  try {
    fullPrompt = await ShowPromptService({ promptId: prompt.id, companyId: ticket.companyId });
  } catch (e) {
    logger.warn(`[ATTENDANCE-FLOW] Falha ao carregar prompt ${prompt.id}:`, e);
    return false;
  }

  const cargo =
    fullPrompt.cargo && typeof fullPrompt.cargo === "object"
      ? fullPrompt.cargo
      : typeof fullPrompt.cargo === "string"
        ? (() => {
            try {
              return JSON.parse(fullPrompt.cargo);
            } catch {
              return {};
            }
          })()
        : {};
  const sectionFlags = (cargo as any).sectionFlags || {};
  if (!isAgentRoteiroRuntimeActive(fullPrompt)) {
    return false;
  }

  /**
   * Tentativa V2 (motor com IR + classifier + hook bus). Atrás de feature flag
   * `ATTENDANCE_FLOW_ENGINE_V2_ENABLED`. Se a flag está off ou o adapter falha
   * graciosamente, segue para o motor V1 abaixo (zero regressão).
   */
  if (isFlowEngineV2Enabled()) {
    try {
      const v2 = await tryHandleAttendanceFlowTurnV2({
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt,
        fullPrompt,
        bodyMessage
      });
      if (v2.source === "v2") {
        if (v2.reason === "defer_to_llm") {
          (ticket as any)[FLOW_LAST_OUTCOME_KEY] = v2;
          return false;
        }
        if (v2.handled || (v2.consumedReply && !v2.allowLlmFallback)) {
          (ticket as any)[FLOW_LAST_OUTCOME_KEY] = v2;
          return v2.handled;
        }
        logger.info(
          `[ATTENDANCE-FLOW] V2 ${v2.reason || "noop"} sem saída — fallback V1 ticket ${ticket.id}`
        );
      } else if (v2.handled) {
        return true;
      }
    } catch (e) {
      logger.warn(`[ATTENDANCE-FLOW] V2 falhou, caindo para V1 ticket ${ticket.id}:`, e);
    }
  }

  const rawSteps = await loadRuntimeFlowStepsForAgent({
    fullPrompt,
    promptId: prompt.id,
    companyId: ticket.companyId
  });
  if (!rawSteps.length) {
    return false;
  }
  if (rawSteps.length === 1) {
    logger.warn(
      `[ATTENDANCE-FLOW] ticket ${ticket.id} prompt ${prompt.id}: runtime com 1 etapa — verifique attendanceScript/AttendanceFlowSteps`
    );
  } else {
    logger.info(
      `[ATTENDANCE-FLOW] ticket ${ticket.id} prompt ${prompt.id}: ${rawSteps.length} etapas no runtime`
    );
  }

  for (const s of rawSteps) {
    const cond = s?.conditions;
    const aid =
      cond && typeof cond === "object" && !Array.isArray(cond)
        ? (cond as Record<string, unknown>)._agentPromptId
        : null;
    if (aid != null && Number(aid) !== Number(prompt.id)) {
      logger.warn(
        `[ATTENDANCE-FLOW] Passo stepNumber=${s.stepNumber} com _agentPromptId=${aid} diferente do agente atual ${prompt.id}`
      );
    }
  }

  const { verifyMessage, verifyMediaMessage, transferQueue } = await import("../WbotServices/wbotMessageListener");

  const loadDw = async (): Promise<Record<string, any>> => {
    const row = await Ticket.findByPk(ticket.id, { attributes: ["dataWebhook"] });
    return normalizeTicketDataWebhook(row?.getDataValue("dataWebhook")) as Record<string, any>;
  };

  const freshDw = await loadDw();
  let af: AttendanceFlowMemory = normalizeAttendanceFlowMemory(freshDw.attendanceFlow, prompt.id);

  if (Number(af.promptId) !== Number(prompt.id)) {
    if (Number(af.lastPresentedStep) > 0 || (af.completedSteps || []).length > 0) {
      af = { ...af, promptId: prompt.id };
    } else {
      af = normalizeAttendanceFlowMemory(
        { promptId: prompt.id, lastPresentedStep: 0, lastHandledUserWid: "", flowPhase: "active" },
        prompt.id
      );
    }
  }

  let lastPresented = Number(af.lastPresentedStep) || 0;
  let resumedFromPrematureComplete = false;

  /** Fluxo marcado completed cedo demais — retoma se ainda há etapas no roteiro. */
  if (af.flowPhase === "completed") {
    const totalSteps = rawSteps.length;
    const doneCount = (af.completedSteps || []).length;
    if (totalSteps > 1 && doneCount < totalSteps) {
      const resumeAt = Math.max(1, Math.min(totalSteps, doneCount > 0 ? doneCount + 1 : lastPresented || 1));
      lastPresented = resumeAt > 0 ? resumeAt : 1;
      af = {
        ...af,
        flowPhase: "active",
        awaitingUserReply: true,
        lastPresentedStep: lastPresented
      };
      resumedFromPrematureComplete = true;
      logger.info(
        `[ATTENDANCE-FLOW] ticket ${ticket.id}: retomando roteiro na etapa ${lastPresented}/${totalSteps} (completed prematuro)`
      );
    } else {
      return false;
    }
  }

  const inboundWid = String(msg?.key?.id || "").trim();
  if (inboundWid && String(af.lastHandledUserWid || "") === inboundWid) {
    // Deduplicação defensiva: mesmo evento inbound chegando novamente não pode repetir etapa/mensagem.
    (ticket as any)[FLOW_LAST_OUTCOME_KEY] = {
      handled: false,
      consumedReply: true,
      sentCount: 0,
      actionCount: 0,
      allowLlmFallback: true,
      source: "v1",
      reason: "dedup_inbound"
    } as FlowTurnOutcome;
    return false;
  }
  let consumedReply = false;

  const persistAf = async (partial: Partial<AttendanceFlowMemory>) => {
    const base = await loadDw();
    const persisted = normalizeAttendanceFlowMemory(base.attendanceFlow, prompt.id);
    const prev =
      Number(persisted.promptId) === Number(prompt.id)
        ? persisted
        : normalizeAttendanceFlowMemory({ promptId: prompt.id }, prompt.id);
    const {
      answersByStep: pAns,
      executedScriptCommands: pExec,
      completedSteps: pComp,
      ...restPartial
    } = partial;
    const next: AttendanceFlowMemory = {
      ...prev,
      ...restPartial,
      promptId: prompt.id,
      answersByStep:
        pAns !== undefined
          ? { ...(prev.answersByStep || {}), ...pAns }
          : { ...(prev.answersByStep || {}) },
      executedScriptCommands:
        pExec !== undefined
          ? { ...(prev.executedScriptCommands || {}), ...pExec }
          : { ...(prev.executedScriptCommands || {}) }
    };
    if (pComp !== undefined) {
      next.completedSteps = pComp;
    }
    const nextDw = { ...base, attendanceFlow: next } as Record<string, unknown>;
    await ticket.update({
      dataWebhook: nextDw as any
    });
    ticket.setDataValue("dataWebhook", nextDw);
    af = next;
  };

  if (resumedFromPrematureComplete) {
    await persistAf({
      flowPhase: "active",
      awaitingUserReply: true,
      lastPresentedStep: lastPresented,
      promptId: prompt.id
    });
  }

  const step1PreviewText = (): string =>
    stripAgentFlowScriptTrainingMarkers(String(getStepByNumber(rawSteps, 1)?.agentPrompt || "")).trim();

  const step1AlreadySentInHistory = async (): Promise<boolean> => {
    const preview1 = step1PreviewText();
    if (!preview1) return false;
    const bodies = await recentAgentOutboundBodies(ticket.id, 14);
    return bodies.some((body) => outboundBodyMatchesStepPreview(body, preview1));
  };

  const healStep1MemoryFromHistory = async (): Promise<void> => {
    if (lastPresented > 0) return;
    const preview1 = step1PreviewText();
    if (!preview1) return;
    if (!(await step1AlreadySentInHistory())) return;
    await persistAf({
      lastPresentedStep: 1,
      awaitingUserReply: true,
      lastPresentedTextPreview: preview1.slice(0, 220),
      flowPhase: "active",
      promptId: prompt.id
    });
    lastPresented = 1;
    logger.info(`[ATTENDANCE-FLOW] ticket ${ticket.id}: etapa 1 já enviada — memória reparada`);
  };

  const markInboundHandled = async () => {
    if (!inboundWid) return;
    await persistAf({
      lastPresentedStep: lastPresented,
      lastHandledUserWid: inboundWid,
      lastUserInboundAt: new Date().toISOString()
    });
  };

  const drainDeferredTransfers = async (
    stepKey: string,
    list: DeferredScriptAction[]
  ): Promise<DeferredScriptAction[]> => {
    let out = [...list];
    const stepRowInfer = getStepByNumber(rawSteps, Number(stepKey));
    const rawInfer = String(stepRowInfer?.agentPrompt || "");
    const marks = af.executedScriptCommands?.[stepKey] || [];
    if (findDeferredTransferIndex(out) < 0 && rawInfer) {
      const xferSlug = findTransferSlugInStepScript(rawInfer);
      if (xferSlug) {
        const slugMark = xferSlug.replace(/^\//, "").toLowerCase();
        const alreadyXfer = marks.some((m) =>
          String(m)
            .toLowerCase()
            .includes(slugMark)
        );
        if (!alreadyXfer) {
          try {
            const row = await findPromptSmartActionRowByScriptSlug(
              fullPrompt.id,
              ticket.companyId,
              xferSlug
            );
            if (row) {
              const typ = String(row.type || "").toLowerCase();
              if (
                typ === "transfer" ||
                typ === "transferir" ||
                xferSlug.toLowerCase().includes("transfer")
              ) {
                out.push({
                  kind: "transferir",
                  slug: String(row.slug || xferSlug).trim() || "transferirchamado",
                  actionId: row.id
                });
              }
            }
          } catch (e) {
            logger.warn(`[ATTENDANCE-FLOW] inferência de transferência no passo ${stepKey} falhou`, e);
          }
        }
      }
    }
    let ti = findDeferredTransferIndex(out);
    while (ti >= 0) {
      const tr = out[ti];
      const userWantsHuman = userRequestsHumanTransfer(String(bodyMessage || ""));
      let assistantDeclared = userWantsHuman;
      if (!assistantDeclared) {
        try {
          const lastOut = await Message.findOne({
            where: { ticketId: ticket.id, fromMe: true },
            order: [["createdAt", "DESC"]],
            attributes: ["body"]
          });
          assistantDeclared = assistantTextImpliesTransferToHuman(String(lastOut?.body || ""));
        } catch {
          assistantDeclared = false;
        }
        if (!assistantDeclared && rawInfer) {
          assistantDeclared = assistantTextImpliesTransferToHuman(rawInfer);
        }
      }
      if (!userWantsHuman && !assistantDeclared) {
        logger.info(
          `[ATTENDANCE-FLOW] transferência adiada omitida — sem declaração do agente nem pedido do cliente ticket=${ticket.id}`
        );
        out.splice(ti, 1);
        ti = findDeferredTransferIndex(out);
        continue;
      }
      let xferOk = false;
      try {
        const xferRes = await executeSmartAction(
          "transferirChamado",
          fullPrompt,
          ticket,
          contact,
          {
            userRequestedTransfer: userWantsHuman,
            assistantDeclaredTransfer: assistantDeclared,
            transferAuthorized: true,
            scriptTransferWithDeclaration: true
          },
          {
            smartActionId: tr.actionId,
            scriptSlug: tr.slug,
            attendanceFlowStep: Number(stepKey)
          }
        );
        xferOk = xferRes.success === true;
      } catch (e) {
        logger.error(`[ATTENDANCE-FLOW] transferência (roteiro) falhou ticket ${ticket.id}`, e);
      }
      out.splice(ti, 1);
      if (xferOk) {
        bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
        try {
          const sk = String(stepKey);
          const prevExec = { ...(af.executedScriptCommands || {}) };
          const existing = [...(prevExec[sk] || [])];
          const slugPart = String(tr.slug || "transferirchamado").replace(/^\//, "");
          const mark = `/${slugPart}`;
          if (!existing.includes(mark)) {
            prevExec[sk] = [...existing, mark];
            await persistAf({ executedScriptCommands: prevExec });
          }
        } catch (e) {
          logger.warn(`[ATTENDANCE-FLOW] persistir marca de transferência falhou ticket ${ticket.id}`, e);
        }
      }
      ti = findDeferredTransferIndex(out);
    }
    return out;
  };

  const mergeCompleted = (stepNum: number) => {
    const set = new Set([...(af.completedSteps || []), stepNum]);
    return [...set].sort((a, b) => a - b);
  };

  const advanceGreetingStepIfApplicable = async (): Promise<boolean> => {
    if (lastPresented <= 0 || !String(bodyMessage || "").trim() || consumedReply) return false;
    if (af.awaitingUserReply !== true) return false;
    const curGreet = getStepByNumber(rawSteps, lastPresented);
    const visibleGreet = stripAgentFlowScriptTrainingMarkers(String(curGreet?.agentPrompt || ""));
    if (!isGreetingStyleStep(visibleGreet)) return false;
    if (!shouldCannedAdvanceOnFreeReply(visibleGreet, bodyMessage)) return false;

    const stepKeyGreet = String(lastPresented);
    let dGreet = [...(af.deferredScriptActions?.[stepKeyGreet] || [])];
    dGreet = await drainDeferredTransfers(stepKeyGreet, dGreet);
    const ndGreet = { ...(af.deferredScriptActions || {}) };
    if (dGreet.length) ndGreet[stepKeyGreet] = dGreet;
    else delete ndGreet[stepKeyGreet];
    if (Object.keys(ndGreet).length !== Object.keys(af.deferredScriptActions || {}).length) {
      await persistAf({ deferredScriptActions: ndGreet });
    }

    const answerGreet = String(bodyMessage || "").trim();
    const nextSeqGreet = lastPresented + 1;
    const nextStepGreet = getStepByNumber(rawSteps, nextSeqGreet);
    if (nextStepGreet) {
      const sentBefore = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
      const actionBefore = runtimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
      await persistAf({
        awaitingUserReply: false,
        completedSteps: mergeCompleted(lastPresented),
        answersByStep: {
          ...(af.answersByStep || {}),
          [stepKeyGreet]: answerGreet
        }
      });
      await presentStep(nextSeqGreet);
      await markInboundHandled();
      const sentAfter = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
      const actionAfter = runtimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
      if (sentAfter > sentBefore || actionAfter > actionBefore) {
        return true;
      }
      consumedReply = true;
      return false;
    }

    await persistAf({
      awaitingUserReply: true,
      answersByStep: {
        ...(af.answersByStep || {}),
        [stepKeyGreet]: answerGreet
      }
    });
    consumedReply = true;
    await markInboundHandled();
    return false;
  };

  const presentStep = async (stepNumber: number) => {
    const step = getStepByNumber(rawSteps, stepNumber);
    if (!step) return;
    const rawStepText = String(step.agentPrompt || "").trim();
    const customerPreview = rawStepText ? stripAgentFlowScriptTrainingMarkers(rawStepText) : "";
    const hasSlashCommands = rawStepText
      .split(/\r?\n/)
      .some((ln) => matchScriptCommandSlugFromLine(ln) != null);
    const hasAttachments = parseAttachments(step.attachments).length > 0;
    let scriptMeta: {
      executedCommands: Array<{ kind: "action" | "media"; slug: string }>;
      deferredActions: Array<{ slug: string; actionId: number; kind?: string }>;
    } = {
      executedCommands: [],
      deferredActions: []
    };
    /** Roteiro bruto: /comandos após RESPOSTA não podem ser descartados pelo strip (só “abertura” antes do EXEMPLO). */
    if (customerPreview.trim() || hasSlashCommands || hasAttachments) {
      scriptMeta = await presentStepWithScriptCommands({
        stepText: rawStepText,
        stepAttachments: step.attachments,
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt: fullPrompt,
        verifyMessage,
        verifyMediaMessage,
        sendStepTextBlocks: async (...args: Parameters<typeof sendStepTextBlocks>): Promise<void> => {
          const [vm, wb, m, t, c, tt, text] = args;
          await sendStepTextBlocks(vm, wb, m, t, c, tt, text, {
            forceFlowOutbound: stepNumber > 1
          });
        },
        transferQueue,
        deferAgendamentoUntilReply: true,
        attendanceFlowStep: stepNumber
      });
    } else {
      if (rawStepText) {
        logger.info(
          `[ATTENDANCE-FLOW] ticket ${ticket.id} passo ${stepNumber}: após remover EXEMPLO/RESPOSTA/objeções do roteiro não restou texto ao cliente — só anexos/comandos se houver`
        );
      }
      await sendStepAttachments(
        verifyMediaMessage,
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        ticket.companyId,
        step.attachments
      );
    }
    const executedActionsCount = (scriptMeta.executedCommands || []).filter((c) => c.kind === "action").length;
    const executedMediaCount = (scriptMeta.executedCommands || []).filter((c) => c.kind === "media").length;
    if (executedActionsCount > 0) bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY, executedActionsCount);
    if (executedMediaCount > 0) bumpRuntimeCounter(ticket, FLOW_SENT_COUNTER_KEY, executedMediaCount);
    lastPresented = stepNumber;
    consumedReply = true;
    const preview = (customerPreview || rawStepText).slice(0, 220);
    const stepKey = String(stepNumber);
    const prevExec = { ...(af.executedScriptCommands || {}) };
    const existing = prevExec[stepKey] || [];
    const newMarks = scriptMeta.executedCommands.map((c) =>
      c.kind === "action" ? `/${c.slug}` : `@media:${c.slug}`
    );
    prevExec[stepKey] = [...new Set([...existing, ...newMarks])];
    const incomingDef = scriptMeta.deferredActions || [];
    const defMap = { ...(af.deferredScriptActions || {}) };
    if (incomingDef.length) {
      defMap[stepKey] = [...(defMap[stepKey] || []), ...incomingDef];
    }
    await persistAf({
      lastPresentedStep: lastPresented,
      lastHandledUserWid: inboundWid || String(af.lastHandledUserWid || ""),
      awaitingUserReply: true,
      lastStepPresentedAt: new Date().toISOString(),
      lastPresentedTextPreview: preview,
      executedScriptCommands: prevExec,
      ...(incomingDef.length ? { deferredScriptActions: defMap } : {}),
      flowPhase: "active"
    });
  };

  await healStep1MemoryFromHistory();

  if (lastPresented === 0) {
    if (await step1AlreadySentInHistory()) {
      await healStep1MemoryFromHistory();
    }
    if (lastPresented === 0) {
      const sentBeforeOpen = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
      await presentStep(1);
      const sentOpen = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY) - sentBeforeOpen;
      if (sentOpen > 0) {
        return true;
      }
      if (await step1AlreadySentInHistory()) {
        await healStep1MemoryFromHistory();
        logger.info(
          `[ATTENDANCE-FLOW] ticket ${ticket.id}: etapa 1 já no histórico — processando resposta na mesma mensagem`
        );
      } else {
        return true;
      }
    }
  }

  if (lastPresented > 0 && (await advanceGreetingStepIfApplicable())) {
    return true;
  }

  const tryAwaitingReplyLinearAdvance = async (): Promise<boolean> => {
    if (lastPresented <= 0 || consumedReply || af.awaitingUserReply !== true) return false;
    const answer = String(bodyMessage || "").trim();
    if (!answer) return false;

    const current = getStepByNumber(rawSteps, lastPresented);
    if (!current) return false;
    const visible = stripAgentFlowScriptTrainingMarkers(String(current.agentPrompt || ""));
    const inbound = classifyScriptInboundTurn(visible, answer);
    if (!inbound.shouldCannedAdvance) return false;

    const nextStep = getStepByNumber(rawSteps, lastPresented + 1);
    if (!nextStep) return false;

    const sentBefore = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
    const actionBefore = runtimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
    await persistAf({
      awaitingUserReply: false,
      completedSteps: mergeCompleted(lastPresented),
      answersByStep: {
        ...(af.answersByStep || {}),
        [String(lastPresented)]: answer
      }
    });
    await presentStep(lastPresented + 1);
    await markInboundHandled();
    const sentAfter = runtimeCounter(ticket, FLOW_SENT_COUNTER_KEY);
    const actionAfter = runtimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
    if (sentAfter > sentBefore || actionAfter > actionBefore) {
      return true;
    }
    consumedReply = true;
    return false;
  };

  if (lastPresented > 0 && (await tryAwaitingReplyLinearAdvance())) {
    return true;
  }

  let inboundDecision: ScriptInboundTurnDecision = {
    shouldCannedAdvance: false,
    deferToLlm: false,
    kind: "unknown",
    reason: ""
  };

  if (lastPresented > 0) {
    const stepKey = String(lastPresented);
    const current = getStepByNumber(rawSteps, lastPresented);
    const visibleNow = stripAgentFlowScriptTrainingMarkers(String(current?.agentPrompt || ""));
    inboundDecision = classifyScriptInboundTurn(visibleNow, bodyMessage);
    const options = current?.responseOptions || [];
    const opt = inboundDecision.deferToLlm
      ? null
      : matchAttendanceFlowResponseOption(bodyMessage, options);

    const continueAfterOptionSelected = async (selected: any, answerLabel: string) => {
      const skDrain = String(lastPresented);
      let defsDrain = [...(af.deferredScriptActions?.[skDrain] || [])];
      const defsDrainLen = defsDrain.length;
      defsDrain = await drainDeferredTransfers(skDrain, defsDrain);
      if (defsDrain.length !== defsDrainLen) {
        const ndDrain = { ...(af.deferredScriptActions || {}) };
        if (defsDrain.length) ndDrain[skDrain] = defsDrain;
        else delete ndDrain[skDrain];
        await persistAf({ deferredScriptActions: ndDrain });
      }

      const nextRaw = selected.nextStep;
      if (nextRaw === null || nextRaw === undefined || nextRaw === "" || String(nextRaw) === "end") {
        await persistAf({
          flowPhase: "completed",
          awaitingUserReply: false,
          lastHandledUserWid: inboundWid || af.lastHandledUserWid || "",
          completedSteps: mergeCompleted(lastPresented),
          answersByStep: { [String(lastPresented)]: answerLabel }
        });
        consumedReply = true;
        const postAction = String(selected.postAction || "").trim();
        if (postAction === "transfer_human") {
          try {
            await applyPromptIntegrationAgentTransfer(ticket, contact, prompt.queueId, prompt);
            bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
          } catch (e) {
            logger.error(`[ATTENDANCE-FLOW] transfer_human falhou ticket ${ticket.id}:`, e);
          }
        } else if (postAction === "schedule_appointment") {
          try {
            const sched = await createScheduleFromFlowCustomerReply(answerLabel, ticket, contact);
            if (sched.created && sched.when) {
              bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
              const label = format(sched.when, "dd/MM/yyyy HH:mm");
              await sendStepTextBlocks(
                verifyMessage,
                wbot,
                msg,
                ticket,
                contact,
                ticketTraking,
                `Agendamento registrado no calendário para ${label}. Qualquer ajuste, é só avisar.`
              );
            } else {
              await sendStepTextBlocks(
                verifyMessage,
                wbot,
                msg,
                ticket,
                contact,
                ticketTraking,
                "Para registrar no calendário, envie o dia e horário (ex.: 15/05 às 14h30 ou amanhã às 10h)."
              );
            }
          } catch (e) {
            logger.error(`[ATTENDANCE-FLOW] schedule_appointment falhou ticket ${ticket.id}:`, e);
            await sendStepTextBlocks(
              verifyMessage,
              wbot,
              msg,
              ticket,
              contact,
              ticketTraking,
              "Não foi possível concluir o agendamento agora. Envie dia e horário em uma nova mensagem ou fale com um atendente."
            );
          }
        } else if (postAction === "create_lead") {
          try {
            await CreateConvertedLeadService({
              name: String(contact.name || "Lead WhatsApp").slice(0, 200),
              description: `WhatsApp · fluxo agente #${prompt.id} · ticket #${ticket.id}`,
              contactId: contact.id,
              companyId: ticket.companyId,
              sector: "WhatsApp"
            });
            bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
          } catch (e) {
            logger.error(`[ATTENDANCE-FLOW] create_lead falhou ticket ${ticket.id}:`, e);
          }
          /* Lead é ação interna — sem mensagem extra ao cliente. */
        }
        await markInboundHandled();
      } else {
        const n = Number(nextRaw);
        if (Number.isFinite(n) && n > 0) {
          await persistAf({
            awaitingUserReply: false,
            completedSteps: mergeCompleted(lastPresented),
            answersByStep: {
              ...(af.answersByStep || {}),
              [String(lastPresented)]: answerLabel
            }
          });
          await presentStep(n);
          await markInboundHandled();
        }
      }
    };

    const deferredList = [...(af.deferredScriptActions?.[stepKey] || [])];
    const agIdx = findDeferredAgendamentoIndex(deferredList);
    if (!opt && agIdx >= 0 && String(bodyMessage || "").trim() && bodyLooksLikeDateOrPeriodReply(bodyMessage)) {
      const bodyTrim = String(bodyMessage || "").trim();
      const parsed = parseDateTimeFromText(bodyTrim);
      if (!parsed.matched || !parsed.date) {
        const periodHint = looksLikePeriodWithoutExactDate(bodyTrim);
        const periodPrompt = (() => {
          switch (periodHint) {
            case "next_week":
              return "Perfeito! Para semana que vem, qual dia da semana e horário ficaria melhor? (ex.: segunda 14h, terça pela manhã)";
            case "next_month":
              return "Show! Para o mês que vem, qual dia e horário ficam melhor? (ex.: 05/06 às 14h)";
            case "weekend":
              return "Show! Sábado ou domingo? E qual horário?";
            case "any_day":
              return "Ótimo! Para conseguir reservar, qual dia e horário ficariam melhor para você? (ex.: 20/05 às 15h)";
            case "morning":
            case "afternoon":
            case "evening":
            case "after_lunch":
              return "Ótimo! Qual o dia (data) e o horário aproximado?";
            case "holiday":
              return "Legal! Qual feriado/dia e horário você gostaria? (ex.: 12/10 às 10h)";
            default:
              return "Para registrar o agendamento, me envie o dia e o horário (ex.: 15/05 às 14h30 ou amanhã às 10h).";
          }
        })();
        await sendStepTextBlocks(
          verifyMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          periodPrompt
        );
        await markInboundHandled();
        return true;
      }
      const ag = deferredList[agIdx];
      const result = await executeSmartAction(
        "agendamento",
        fullPrompt,
        ticket,
        contact,
        { customerReply: bodyTrim, date: parsed.date, lastUserMessage: bodyTrim },
        {
          smartActionId: ag.actionId,
          scriptSlug: ag.slug || "agendamento",
          attendanceFlowStep: lastPresented
        }
      );
      if (result.success) bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
      deferredList.splice(agIdx, 1);
      let afterAgDef = await drainDeferredTransfers(stepKey, deferredList);
      const nextDef = { ...(af.deferredScriptActions || {}) };
      if (afterAgDef.length) nextDef[stepKey] = afterAgDef;
      else delete nextDef[stepKey];
      await persistAf({ deferredScriptActions: nextDef });

      if (result.success && result.message) {
        await sendStepTextBlocks(
          verifyMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          result.message
        );
      } else if (!result.success) {
        await sendStepTextBlocks(
          verifyMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          result.message ||
            "Não foi possível concluir o agendamento. Envie outra data/horário ou fale com um atendente."
        );
        await markInboundHandled();
        return true;
      }

      await persistAf({
        awaitingUserReply: false,
        completedSteps: mergeCompleted(lastPresented),
        answersByStep: {
          ...(af.answersByStep || {}),
          [stepKey]: bodyTrim
        }
      });
      const nextSeq = lastPresented + 1;
      const nextStep = getStepByNumber(rawSteps, nextSeq);
      if (nextStep) {
        await presentStep(nextSeq);
      } else {
        await persistAf({
          flowPhase: "completed",
          awaitingUserReply: false,
          lastHandledUserWid: inboundWid || af.lastHandledUserWid || ""
        });
      }
      await markInboundHandled();
      return true;
    }

    /**
     * Fallback: roteiro tem /agendamento na etapa mas `deferredScriptActions` veio vazio
     * (ex.: perda de estado, migração ou primeira execução sem persistir tail) — ainda assim cria em Schedules.
     */
    if (
      !opt &&
      agIdx < 0 &&
      String(bodyMessage || "").trim() &&
      bodyLooksLikeDateOrPeriodReply(bodyMessage) &&
      stepScriptMentionsAgendamentoCommand(String(current?.agentPrompt || ""))
    ) {
      const bodyTrimInf = String(bodyMessage || "").trim();
      const parsedInf = parseDateTimeFromText(bodyTrimInf);
      if (parsedInf.matched && parsedInf.date) {
        const slugInf = findAgendamentoSlugInStepScript(String(current?.agentPrompt || ""));
        if (slugInf) {
          const rowInf = await findPromptSmartActionRowByScriptSlug(
            fullPrompt.id,
            ticket.companyId,
            slugInf
          );
          if (rowInf) {
            const resultInf = await executeSmartAction(
              "agendamento",
              fullPrompt,
              ticket,
              contact,
              {
                customerReply: bodyTrimInf,
                date: parsedInf.date,
                lastUserMessage: bodyTrimInf
              },
              {
                smartActionId: rowInf.id,
                scriptSlug: slugInf,
                attendanceFlowStep: lastPresented
              }
            );
            if (resultInf.success) bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
            let listAfterInf = [...(af.deferredScriptActions?.[stepKey] || [])];
            listAfterInf = await drainDeferredTransfers(stepKey, listAfterInf);
            const nextDefInf = { ...(af.deferredScriptActions || {}) };
            if (listAfterInf.length) nextDefInf[stepKey] = listAfterInf;
            else delete nextDefInf[stepKey];
            await persistAf({ deferredScriptActions: nextDefInf });

            if (resultInf.success && resultInf.message) {
              await sendStepTextBlocks(
                verifyMessage,
                wbot,
                msg,
                ticket,
                contact,
                ticketTraking,
                resultInf.message
              );
            } else if (!resultInf.success) {
              await sendStepTextBlocks(
                verifyMessage,
                wbot,
                msg,
                ticket,
                contact,
                ticketTraking,
                resultInf.message ||
                  "Não foi possível concluir o agendamento. Envie outra data/horário ou fale com um atendente."
              );
              await markInboundHandled();
              return true;
            }

            await persistAf({
              awaitingUserReply: false,
              completedSteps: mergeCompleted(lastPresented),
              answersByStep: {
                ...(af.answersByStep || {}),
                [stepKey]: bodyTrimInf
              }
            });
            const nextSeqInf = lastPresented + 1;
            const nextStepInf = getStepByNumber(rawSteps, nextSeqInf);
            if (nextStepInf) {
              await presentStep(nextSeqInf);
            } else {
              await persistAf({
                flowPhase: "completed",
                awaitingUserReply: false,
                lastHandledUserWid: inboundWid || af.lastHandledUserWid || ""
              });
            }
            await markInboundHandled();
            return true;
          }
        }
      }
    }

    if (opt) {
      const deferredForOpt = [...(af.deferredScriptActions?.[stepKey] || [])];
      const agOptIdx = findDeferredAgendamentoIndex(deferredForOpt);
      if (agOptIdx >= 0) {
        const bodyTrim = String(bodyMessage || "").trim();
        const parsed = parseDateTimeFromText(bodyTrim);
        if (!parsed.matched || !parsed.date) {
          await persistAf({
            answersByStep: { [stepKey]: bodyTrim }
          });
          await sendStepTextBlocks(
            verifyMessage,
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            "Perfeito. Para concluir o agendamento, envie o dia e o horário (ex.: 15/05 às 14h30 ou amanhã às 10h)."
          );
          await markInboundHandled();
          return true;
        }
        const ag = deferredForOpt[agOptIdx];
        const result = await executeSmartAction(
          "agendamento",
          fullPrompt,
          ticket,
          contact,
          { customerReply: bodyTrim, date: parsed.date, lastUserMessage: bodyTrim },
          {
            smartActionId: ag.actionId,
            scriptSlug: ag.slug || "agendamento",
            attendanceFlowStep: lastPresented
          }
        );
        if (result.success) bumpRuntimeCounter(ticket, FLOW_ACTION_COUNTER_KEY);
        deferredForOpt.splice(agOptIdx, 1);
        const nextDefAg = { ...(af.deferredScriptActions || {}) };
        if (deferredForOpt.length) nextDefAg[stepKey] = deferredForOpt;
        else delete nextDefAg[stepKey];
        await persistAf({ deferredScriptActions: nextDefAg });

        if (!result.success) {
          await sendStepTextBlocks(
            verifyMessage,
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            result.message ||
              "Não foi possível concluir o agendamento. Envie outra data/horário ou fale com um atendente."
          );
          await markInboundHandled();
          return true;
        }
        if (result.message) {
          await sendStepTextBlocks(
            verifyMessage,
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            result.message
          );
        }
        await continueAfterOptionSelected(opt, bodyTrim);
        return true;
      }

      await continueAfterOptionSelected(opt, String(bodyMessage || "").trim());
    } else if (
      String(bodyMessage || "").trim().length > 0 &&
      (!options || options.length === 0) &&
      shouldAdvanceOnFreeReply(bodyMessage) &&
      customerVisibleStepEndsWithQuestionOrCommand(String(current?.agentPrompt || "")) &&
      shouldCannedAdvanceOnFreeReply(visibleNow, bodyMessage) &&
      plausibleFreeReplyAdvancesStep(visibleNow, bodyMessage)
    ) {
      {
        let dFree = [...(af.deferredScriptActions?.[stepKey] || [])];
        const dFreeLen = dFree.length;
        dFree = await drainDeferredTransfers(stepKey, dFree);
        if (dFree.length !== dFreeLen) {
          const ndFree = { ...(af.deferredScriptActions || {}) };
          if (dFree.length) ndFree[stepKey] = dFree;
          else delete ndFree[stepKey];
          await persistAf({ deferredScriptActions: ndFree });
        }
      }
      if (findDeferredAgendamentoIndex([...(af.deferredScriptActions?.[stepKey] || [])]) >= 0) {
        await sendStepTextBlocks(
          verifyMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          "Para registrar no calendário, envie o **dia** (e horário, se quiser), ex.: 15/05 às 14h30, amanhã às 10h ou “final de julho”."
        );
        await markInboundHandled();
        return true;
      }
      const nextSeq = lastPresented + 1;
      const nextStep = getStepByNumber(rawSteps, nextSeq);
      if (nextStep) {
        await persistAf({
          awaitingUserReply: false,
          completedSteps: mergeCompleted(lastPresented),
          answersByStep: {
            ...(af.answersByStep || {}),
            [String(lastPresented)]: String(bodyMessage || "").trim()
          }
        });
        await presentStep(nextSeq);
        await markInboundHandled();
      } else {
        await persistAf({
          flowPhase: "completed",
          awaitingUserReply: false,
          lastHandledUserWid: inboundWid || af.lastHandledUserWid || "",
          completedSteps: mergeCompleted(lastPresented),
          answersByStep: { [String(lastPresented)]: String(bodyMessage || "").trim() }
        });
        consumedReply = true;
        await markInboundHandled();
      }
    } else if (inboundDecision.deferToLlm) {
      /* não avança etapa canned — LLM/orquestrador responde FAQ e retoma etapa pendente */
    }
    // Se ainda não consumiu, os guardrails abaixo decidem entre dica curta e fallback controlado.
  }

  if (
    lastPresented > 0 &&
    String(bodyMessage || "").trim() &&
    !consumedReply
  ) {
    const stepKeyEnd = String(lastPresented);
    const defRemain = [...(af.deferredScriptActions?.[stepKeyEnd] || [])];
    if (
      findDeferredAgendamentoIndex(defRemain) >= 0 &&
      !bodyLooksLikeDateOrPeriodReply(bodyMessage) &&
      !inboundDecision.deferToLlm &&
      !looksLikePricingOrOffTopicVersusDateQuestion(bodyMessage)
    ) {
      const t = String(bodyMessage || "").trim();
      if (isTrivialFlowInboundNoise(t)) {
        await sendStepTextBlocks(
          verifyMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          "Qual **data ou período** você pensa em viajar? (ex.: 21/05, final de julho ou próximo feriado.) Assim registro sua preferência."
        );
        await markInboundHandled();
        return true;
      }
    }
  }

  /**
   * Aguardando resposta real do cliente (roteiro visual), mas a mensagem é só cumprimento/ruído:
   * em etapa de saudação avança; caso contrário envia dica curta (se o outbound guard permitir).
   */
  /** `persistAf` pode setar flowPhase para "completed" depois do early-return; TS não infere isso. */
  const flowPhaseNow = af.flowPhase as AttendanceFlowPhase;
  if (
    lastPresented > 0 &&
    String(bodyMessage || "").trim() &&
    !consumedReply &&
    flowPhaseNow !== "completed" &&
    af.awaitingUserReply === true &&
    isTrivialFlowInboundNoise(bodyMessage)
  ) {
    if (await advanceGreetingStepIfApplicable()) {
      return true;
    }
    const curWait = getStepByNumber(rawSteps, lastPresented);
    const visibleWait = stripAgentFlowScriptTrainingMarkers(String(curWait?.agentPrompt || ""));
    const linesWait = visibleWait
      .split(/\r?\n/)
      .map((l: string) => l.trim())
      .filter(Boolean);
    const qLineWait = [...linesWait].reverse().find((l: string) => /\?\s*$/.test(l));
    const hint =
      qLineWait != null && qLineWait.length
        ? `Claro! ${qLineWait}`
        : String(af.lastPresentedTextPreview || "").trim() ||
          "Quando puder, envie a informação que pedimos acima, por favor.";
    const sentHint = await sendStepTextBlocks(
      verifyMessage,
      wbot,
      msg,
      ticket,
      contact,
      ticketTraking,
      hint
    );
    await markInboundHandled();
    if (sentHint > 0) {
      return true;
    }
  }

  return consumedReply;
}
