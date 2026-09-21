/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * PendingIntentResolver (PR 13)
 *
 * Quando o cliente responde, percorre `agentState.pendingIntents` e satisfaz
 * cada intent compatível com a mensagem do usuário. Funciona em paralelo às
 * ações do roteiro (`/agendamento` etc) sem duplicar disparos.
 *
 * Não envia mensagem por si só — apenas dispara `executeSmartAction` / transferência.
 * Retorna `{ handled, message? }` para o listener decidir se interrompe o turno.
 *
 * Behind global flag `AGENT_INTENT_TRIGGER_ENABLED`.
 */

import logger from "../../utils/logger";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Prompt from "../../models/Prompt";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { normalizeAgentConversationalMemory } from "../../helpers/agentConversationalMemory";
import PromptSmartAction from "../../models/PromptSmartAction";
import { executeSmartAction } from "./PromptSmartActionExecutorService";
import {
  assistantTextImpliesTransferToHuman,
  userConfirmsTransferAfterAgentOffer,
  userRequestsHumanTransfer
} from "../../helpers/assistantTransferIntent";
import {
  assistantTextImpliesSchedulingOffer,
  userMessageMatchesSchedulingTriggers,
  userProvidesScheduleDateTime,
  userRequestsScheduling
} from "../../helpers/assistantScheduleIntent";
import {
  activityExecutionAuthorized,
  isSilentCustomerSmartActionSlug,
  leadExecutionAuthorized
} from "../../helpers/assistantCrmActionIntent";
import {
  registerPendingIntents,
  filterPendingIntentsToEnabledSmartActions,
  type PendingIntent,
  type AgentIntentKind
} from "./IntentTriggerEngine";

export interface PendingIntentResolution {
  handled: boolean;
  message?: string;
  satisfiedKinds: AgentIntentKind[];
  remainingIntents: PendingIntent[];
}

function memoryActionVariables(ticket: Ticket, promptId?: number | null): Record<string, unknown> {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const memory = normalizeAgentConversationalMemory(agentState.conversationalMemory, Number(promptId || 0));
  const facts = memory.knownFacts || {};
  return {
    ...(facts.name ? { name: facts.name } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    ...(facts.phone ? { phone: facts.phone } : {}),
    ...(facts.city ? { city: facts.city, address: facts.city } : {}),
    ...(facts.company ? { company: facts.company } : {}),
    ...(facts.interest ? { interest: facts.interest } : {}),
    ...(facts.objective ? { objective: facts.objective } : {}),
    ...(facts.preferredTime ? { preferredTime: facts.preferredTime } : {}),
    ...(memory.lastAssistantQuestion ? { lastAssistantQuestion: memory.lastAssistantQuestion } : {}),
    ...(memory.lastUserAnswer ? { lastUserAnswer: memory.lastUserAnswer } : {})
  };
}

function pendingIntentsFromTicket(ticket: Ticket): PendingIntent[] {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const arr = Array.isArray(agentState.pendingIntents) ? agentState.pendingIntents : [];
  const now = Date.now();
  return arr.filter((p: PendingIntent) => {
    if (!p || !p.kind || !p.registeredAt) return false;
    const age = (now - new Date(p.registeredAt).getTime()) / 60000;
    return age <= (Number.isFinite(p.maxAgeMinutes) ? p.maxAgeMinutes : 30);
  });
}

async function persistRemainingPendingIntents(ticket: Ticket, remaining: PendingIntent[]): Promise<void> {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const nextDw = {
    ...dw,
    agentState: {
      ...agentState,
      pendingIntents: remaining
    }
  };
  try {
    await (ticket as any).update({ dataWebhook: nextDw });
    (ticket as any).setDataValue && (ticket as any).setDataValue("dataWebhook", nextDw);
  } catch (e) {
    logger.warn("[PendingIntentResolver] falha ao persistir pendingIntents:", e as any);
  }
}

interface ResolveOpts {
  /**
   * Janela de proteção contra duplicar com o roteiro: se a ação foi disparada via
   * `/agendamento` na mesma janela, não dispara de novo aqui.
   */
  scriptDedupeWindowMinutes?: number;
}

function normalizePatternList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 40);
}

async function findEnabledScheduleAction(
  prompt: Prompt,
  ticket: Ticket
): Promise<PromptSmartAction | null> {
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    return (
      actions.find(
        (a) =>
          (a as any).enabled !== false &&
          (String(a.type || "").toLowerCase() === "agendamento" ||
            /agend|marcar|reserv/.test(String(a.slug || "").toLowerCase()))
      ) || null
    );
  } catch {
    return null;
  }
}

async function findEnabledLeadAction(
  prompt: Prompt,
  ticket: Ticket
): Promise<PromptSmartAction | null> {
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    return (
      actions.find(
        (a) =>
          (a as any).enabled !== false &&
          (String(a.type || "").toLowerCase() === "criar_lead" ||
            /lead/.test(String(a.slug || "").toLowerCase()))
      ) || null
    );
  } catch {
    return null;
  }
}

async function findEnabledActivityAction(
  prompt: Prompt,
  ticket: Ticket
): Promise<PromptSmartAction | null> {
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    return (
      actions.find(
        (a) =>
          (a as any).enabled !== false &&
          (String(a.type || "").toLowerCase() === "criar_atividade" ||
            /atividade|tarefa|lembrete/.test(String(a.slug || "").toLowerCase()))
      ) || null
    );
  } catch {
    return null;
  }
}

async function findEnabledTransferAction(
  prompt: Prompt,
  ticket: Ticket
): Promise<PromptSmartAction | null> {
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    return (
      actions.find(
        (a) =>
          (a as any).enabled !== false &&
          (String(a.type || "").toLowerCase() === "transferir" ||
            /transfer/.test(String(a.slug || "").toLowerCase()))
      ) || null
    );
  } catch {
    return null;
  }
}

async function tryInboundScheduleResolution(
  ticket: Ticket,
  contact: Contact,
  prompt: Prompt,
  body: string,
  rememberedVars: Record<string, unknown>,
  lastAssistantText: string,
  existingIntents: PendingIntent[]
): Promise<PendingIntentResolution | null> {
  const scheduleAction = await findEnabledScheduleAction(prompt, ticket);
  if (!scheduleAction) return null;

  const userPatterns = normalizePatternList((scheduleAction as any).userTriggerPatterns);
  const userAsked = userRequestsScheduling(body);
  const userPatternHit = userMessageMatchesSchedulingTriggers(body, userPatterns);
  const agentOffered = assistantTextImpliesSchedulingOffer(lastAssistantText);
  const hasPendingSchedule = existingIntents.some((i) => i.kind === "schedule");
  const { matched: hasDate, date } = userProvidesScheduleDateTime(body);

  const scheduleContext =
    userAsked || userPatternHit || agentOffered || hasPendingSchedule;

  if (!scheduleContext) return null;

  if (hasDate && date) {
    const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
    const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<
      string,
      any
    >;
    const lastHandledAction = String(agentState.lastHandledAction || "").toLowerCase();
    const lastHandledAt = agentState.lastHandledAt ? new Date(agentState.lastHandledAt).getTime() : 0;
    const lastOutcome = String(agentState.lastHandledOutcome || "");
    const minutesSinceLast = lastHandledAt ? (Date.now() - lastHandledAt) / 60000 : Infinity;
    if (
      minutesSinceLast <= 2 &&
      lastOutcome === "success" &&
      /:agendamento/.test(lastHandledAction)
    ) {
      const remaining = existingIntents.filter((i) => i.kind !== "schedule");
      await persistRemainingPendingIntents(ticket, remaining);
      return {
        handled: false,
        satisfiedKinds: ["schedule"],
        remainingIntents: remaining
      };
    }
    try {
      const result = await executeSmartAction(
        "agendamento",
        prompt,
        ticket,
        contact,
        {
          ...rememberedVars,
          customerReply: body,
          lastUserMessage: body,
          date,
          scheduleAuthorized: true
        },
        {
          smartActionId: scheduleAction.id,
          scriptSlug: String(scheduleAction.slug || "agendamento")
        }
      );
      if (result.success) {
        const remaining = existingIntents.filter((i) => i.kind !== "schedule");
        await persistRemainingPendingIntents(ticket, remaining);
        return {
          handled: true,
          message: result.message,
          satisfiedKinds: ["schedule"],
          remainingIntents: remaining
        };
      }
    } catch (e) {
      logger.warn("[PendingIntentResolver] agendamento inbound com data falhou:", e as any);
    }
    return null;
  }

  if (userAsked || userPatternHit || agentOffered) {
    await registerPendingIntents(ticket, [
      {
        kind: "schedule",
        smartActionId: scheduleAction.id,
        slug: String(scheduleAction.slug || "agendamento"),
        confidence: 0.92,
        matchedPattern: userAsked
          ? "userRequestsScheduling"
          : userPatternHit
            ? "userTriggerPattern"
            : "assistantSchedulingOffer",
        satisfiedBy: "date",
        maxAgeMinutes: 30
      }
    ]);
  }

  return null;
}

export async function resolvePendingIntents(
  ticket: Ticket,
  contact: Contact,
  prompt: Prompt | null,
  bodyMessage: string,
  opts: ResolveOpts = {}
): Promise<PendingIntentResolution> {
  const intents = pendingIntentsFromTicket(ticket);
  const body = String(bodyMessage || "").trim();
  if (!body) {
    return { handled: false, satisfiedKinds: [], remainingIntents: intents };
  }

  const rememberedVars = memoryActionVariables(ticket, prompt?.id);
  const lastAssistantText = String(rememberedVars.lastAssistantQuestion || "");

  /** Pedido explícito do cliente — só se a ação Transferir estiver ativa no agente. */
  if (prompt && userRequestsHumanTransfer(body)) {
    const transferAction = await findEnabledTransferAction(prompt, ticket);
    if (transferAction) {
      try {
        const result = await executeSmartAction(
          "transferirChamado",
          prompt,
          ticket,
          contact,
          {
            ...rememberedVars,
            customerReply: body,
            lastUserMessage: body,
            userRequestedTransfer: true,
            transferAuthorized: true
          },
          {
            smartActionId: transferAction.id,
            scriptSlug: String(transferAction.slug || "transferirchamado")
          }
        );
        if (result.success) {
          const remaining = intents.filter((i) => i.kind !== "transfer");
          await persistRemainingPendingIntents(ticket, remaining);
          return {
            handled: true,
            message: result.message,
            satisfiedKinds: ["transfer"],
            remainingIntents: remaining
          };
        }
      } catch (e) {
        logger.warn("[PendingIntentResolver] transferência por pedido do cliente falhou:", e as any);
      }
    }
  }

  if (prompt) {
    const scheduleHit = await tryInboundScheduleResolution(
      ticket,
      contact,
      prompt,
      body,
      rememberedVars,
      lastAssistantText,
      intents
    );
    if (scheduleHit?.handled) {
      return scheduleHit;
    }
  }

  if (!intents.length) {
    return { handled: false, satisfiedKinds: [], remainingIntents: intents };
  }
  const dedupeWindow = opts.scriptDedupeWindowMinutes ?? 2;

  const satisfied: AgentIntentKind[] = [];
  const remaining: PendingIntent[] = [];
  let resolutionMessage: string | undefined;
  let handled = false;

  // Verifica dedup contra roteiro recente
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const lastHandledAction = String(agentState.lastHandledAction || "");
  const lastHandledAt = agentState.lastHandledAt ? new Date(agentState.lastHandledAt).getTime() : 0;
  const lastOutcome = String(agentState.lastHandledOutcome || "");
  const minutesSinceLast = lastHandledAt ? (Date.now() - lastHandledAt) / 60000 : Infinity;

  function recentlyHandledByScript(kind: AgentIntentKind): boolean {
    if (minutesSinceLast > dedupeWindow || lastOutcome !== "success") return false;
    const k = lastHandledAction.toLowerCase();
    switch (kind) {
      case "schedule":
        return /:agendamento/.test(k);
      case "transfer":
        return /:transferirchamado/.test(k);
      case "create_lead":
        return /:criarlead/.test(k);
      case "create_activity":
        return /:criaratividade/.test(k);
      case "create_contact":
        return /:criarcontato/.test(k);
      case "send_link":
        return /:enviarlink/.test(k);
      case "check_agenda":
        return /:consultaragenda/.test(k);
      case "consult_products":
        return /:consultarprodutos/.test(k);
      case "passar_preco":
        return /:passarpreco/.test(k);
      case "consult_stock":
        return /:consultarestoque/.test(k);
      case "send_product_link":
        return /:enviarlinkproduto/.test(k);
      case "register_purchase_intent":
        return /:registrarintencaocompra/.test(k);
      default:
        return false;
    }
  }

  for (const intent of intents) {
    if (handled) {
      remaining.push(intent);
      continue;
    }

    if (recentlyHandledByScript(intent.kind)) {
      // Já foi resolvido pelo roteiro nessa janela; remove sem disparar de novo.
      satisfied.push(intent.kind);
      continue;
    }

    const tryResolve = async (): Promise<boolean> => {
      switch (intent.kind) {
        case "schedule": {
          const parsed = userProvidesScheduleDateTime(body);
          const contextOk =
            assistantTextImpliesSchedulingOffer(lastAssistantText) ||
            userRequestsScheduling(body) ||
            userMessageMatchesSchedulingTriggers(
              body,
              normalizePatternList(
                (await findEnabledScheduleAction(prompt, ticket))?.userTriggerPatterns
              )
            );
          if (!contextOk) {
            return false;
          }
          if (parsed.matched && parsed.date && prompt) {
            const result = await executeSmartAction(
              "agendamento",
              prompt,
              ticket,
              contact,
              {
                ...rememberedVars,
                customerReply: body,
                date: parsed.date,
                lastUserMessage: body,
                scheduleAuthorized: true
              },
              { smartActionId: intent.smartActionId, scriptSlug: intent.slug || "agendamento" }
            );
            if (result.success) {
              satisfied.push(intent.kind);
              if (result.message) resolutionMessage = result.message;
              return true;
            }
            return false;
          }
          // Ambíguo (período sem data): apenas mantém pendente — preserva no `remaining` abaixo.
          return false;
        }
        case "transfer": {
          const transferAction = prompt ? await findEnabledTransferAction(prompt, ticket) : null;
          if (!transferAction) return false;
          const userAsked = userRequestsHumanTransfer(body);
          const userConfirmed = userConfirmsTransferAfterAgentOffer(body, lastAssistantText);
          if (!userAsked && !userConfirmed) {
            return false;
          }
          if (!assistantTextImpliesTransferToHuman(lastAssistantText) && !userAsked) {
            return false;
          }
          if (!prompt) return false;
          const result = await executeSmartAction(
            "transferirChamado",
            prompt,
            ticket,
            contact,
            {
              ...rememberedVars,
              customerReply: body,
              lastUserMessage: body,
              userRequestedTransfer: userAsked,
              assistantDeclaredTransfer: !userAsked,
              transferAuthorized: true
            },
            {
              smartActionId: intent.smartActionId || transferAction.id,
              scriptSlug: intent.slug || String(transferAction.slug || "transferirchamado")
            }
          );
          if (result.success) {
            satisfied.push(intent.kind);
            if (result.message) resolutionMessage = result.message;
            return true;
          }
          return false;
        }
        case "create_lead": {
          if (!prompt) return false;
          const leadAction = await findEnabledLeadAction(prompt, ticket);
          if (!leadAction) return false;
          const userPatterns = normalizePatternList((leadAction as any).userTriggerPatterns);
          const agentPatterns = normalizePatternList((leadAction as any).agentTriggerPatterns);
          if (
            !leadExecutionAuthorized({
              userText: body,
              lastAssistantText,
              userTriggerPatterns: userPatterns,
              agentTriggerPatterns: agentPatterns
            })
          ) {
            return false;
          }
          const slug = String(intent.slug || leadAction.slug || "criarLead");
          const result = await executeSmartAction(
            "criarLead",
            prompt,
            ticket,
            contact,
            { ...rememberedVars, customerReply: body, lastUserMessage: body, leadAuthorized: true },
            { smartActionId: leadAction.id, scriptSlug: slug }
          );
          if (result.success) {
            satisfied.push(intent.kind);
            return false;
          }
          return false;
        }
        case "create_activity": {
          const activityAction = await findEnabledActivityAction(prompt, ticket);
          if (!activityAction) return false;
          const userPatterns = normalizePatternList((activityAction as any).userTriggerPatterns);
          const agentPatterns = normalizePatternList((activityAction as any).agentTriggerPatterns);
          if (
            !activityExecutionAuthorized({
              userText: body,
              lastAssistantText,
              userTriggerPatterns: userPatterns,
              agentTriggerPatterns: agentPatterns
            })
          ) {
            return false;
          }
          const slug = String(intent.slug || activityAction.slug || "criarAtividade");
          const result = await executeSmartAction(
            "criarAtividade",
            prompt,
            ticket,
            contact,
            { ...rememberedVars, customerReply: body, lastUserMessage: body, activityAuthorized: true },
            { smartActionId: activityAction.id, scriptSlug: slug }
          );
          if (result.success) {
            satisfied.push(intent.kind);
            return false;
          }
          return false;
        }
        case "create_contact":
        case "send_link":
        case "check_agenda":
        case "consult_products":
        case "passar_preco":
        case "consult_stock":
        case "send_product_link":
        case "register_purchase_intent":
        case "custom": {
          if (!prompt || !intent.slug) return false;
          const slug = String(intent.slug);
          const result = await executeSmartAction(
            slug,
            prompt,
            ticket,
            contact,
            { ...rememberedVars, customerReply: body, lastUserMessage: body },
            { smartActionId: intent.smartActionId, scriptSlug: slug }
          );
          if (result.success) {
            satisfied.push(intent.kind);
            const silent = isSilentCustomerSmartActionSlug(slug);
            if (!silent && result.message) resolutionMessage = result.message;
            return true;
          }
          return false;
        }
        default:
          return false;
      }
    };

    let resolved = false;
    try {
      resolved = await tryResolve();
    } catch (e) {
      logger.warn(`[PendingIntentResolver] erro ao resolver intent ${intent.kind}:`, e as any);
      resolved = false;
    }

    if (resolved) {
      handled = true;
    } else if (!satisfied.includes(intent.kind)) {
      // Ainda não satisfez e não foi marcado como satisfied → permanece pendente
      const bumped: PendingIntent = {
        ...intent,
        attempts: (intent.attempts || 0) + 1
      };
      if ((bumped.attempts || 0) < 4) remaining.push(bumped);
    }
  }

  await persistRemainingPendingIntents(ticket, remaining);

  return {
    handled,
    message: resolutionMessage,
    satisfiedKinds: satisfied,
    remainingIntents: remaining
  };
}
