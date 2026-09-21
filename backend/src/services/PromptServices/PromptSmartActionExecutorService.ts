/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Prompt from "../../models/Prompt";
import PromptSmartAction from "../../models/PromptSmartAction";
import { smartActionWhereForRuntime } from "../../providers/anthropic/utils/smartActionScope";
import ConvertedLead from "../../models/ConvertedLead";
import Activity from "../../models/Activity";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import CreateConvertedLeadService from "../ConvertedLeadServices/CreateService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import logger from "../../utils/logger";
import CreateScheduleService from "../ScheduleServices/CreateService";
import {
  buildCatalogMessage,
  findInventoryProductsForAgent,
  formatInventoryAgentReply,
  getAgentInventoryConfig,
  resolveReplyForProduct,
  sendInventoryReplyMedia,
  stockStatusLabel
} from "../../helpers/agentInventoryRuntime";
import { getIO } from "../../libs/socket";
import { format } from "date-fns";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { parseDateTimeFromText } from "../../helpers/parseDateTimeFromText";
import { findConflictingScheduleSlot } from "../../helpers/scheduleSlotConflict";
import {
  resolveTransferCustomerMessage,
  transferExecutionAuthorized
} from "../../helpers/assistantTransferIntent";
import { scheduleExecutionAuthorized } from "../../helpers/assistantScheduleIntent";
import {
  appendScheduleSlotMinutesMarker,
  resolveMeetingSlotMinutes
} from "../../helpers/meetingSlotDuration";
import {
  activityExecutionAuthorized,
  isSilentCustomerSmartActionSlug,
  leadExecutionAuthorized
} from "../../helpers/assistantCrmActionIntent";

export { isSilentCustomerSmartActionSlug };
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import { normalizeAgentConversationalMemory } from "../../helpers/agentConversationalMemory";
import LeadPipeline from "../../models/LeadPipeline";
import LeadPipelineStage from "../../models/LeadPipelineStage";

interface ActionExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export type PromptSmartActionToolMetadata = {
  id: number;
  slug: string;
  type: string;
  name: string;
  description: string;
  requiredFields: string[];
  variables: Record<string, unknown>;
  triggerHints: {
    agent: string[];
    user: string[];
  };
};

const TRANSFER_SLUG_ALIASES = [
  "transferirchamado",
  "transferirChamado",
  "transferiratendimento",
  "transferirAtendimento"
];

function isTransferAlias(slug: string): boolean {
  const s = String(slug || "").toLowerCase();
  return TRANSFER_SLUG_ALIASES.includes(s) || s.includes("transferir");
}

function sanitizeActionString(value: unknown, max = 180): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function looksLikePhoneOnly(value: unknown): boolean {
  const s = sanitizeActionString(value, 80);
  if (!s) return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 8 && digits.length >= s.replace(/\s+/g, "").length - 3;
}

function memoryActionVariables(ticket: Ticket, contact: Contact, promptId?: number | null): Record<string, unknown> {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const memory = normalizeAgentConversationalMemory(agentState.conversationalMemory, Number(promptId || 0));
  const facts = memory.knownFacts || {};
  return {
    ...(contact?.name ? { contactName: contact.name } : {}),
    ...(contact?.number ? { contactPhone: contact.number, phone: facts.phone || contact.number } : {}),
    ...(contact?.email ? { contactEmail: contact.email, email: facts.email || contact.email } : {}),
    ...(facts.name ? { name: facts.name } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    ...(facts.phone ? { phone: facts.phone } : {}),
    ...(facts.city ? { city: facts.city, address: facts.city } : {}),
    ...(facts.company ? { company: facts.company } : {}),
    ...(facts.interest ? { interest: facts.interest, description: facts.interest } : {}),
    ...(facts.objective ? { objective: facts.objective } : {}),
    ...(facts.preferredTime ? { preferredTime: facts.preferredTime } : {}),
    ...(memory.lastAssistantQuestion ? { lastAssistantQuestion: memory.lastAssistantQuestion } : {}),
    ...(memory.lastUserAnswer ? { lastUserAnswer: memory.lastUserAnswer } : {})
  };
}

function configuredRequiredFields(action: PromptSmartAction): string[] {
  const vars = action.variables && typeof action.variables === "object" ? (action.variables as Record<string, any>) : {};
  const fromVars = Array.isArray(vars.requiredFields) ? vars.requiredFields : [];
  const fromSchema = Array.isArray((action as any).intentSlotSchema)
    ? ((action as any).intentSlotSchema as any[])
        .filter((slot) => slot && slot.required === true && slot.name)
        .map((slot) => String(slot.name))
    : [];
  return [...new Set([...fromVars, ...fromSchema].map((field) => sanitizeActionString(field, 60)).filter(Boolean))];
}

function hasActionValue(field: string, variables: Record<string, unknown>, contact: Contact): boolean {
  const aliases: Record<string, string[]> = {
    name: ["name", "contactName"],
    phone: ["phone", "contactPhone", "number", "whatsapp"],
    email: ["email", "contactEmail"],
    date: ["date", "preferredTime"],
    title: ["title", "activityTitle"],
    description: ["description", "note", "notes", "lastUserAnswer"],
    responsibleId: ["responsibleId", "userId"]
  };
  const keys = aliases[field] || [field];
  for (const key of keys) {
    const value = variables[key];
    if (value !== undefined && value !== null && sanitizeActionString(value).length > 0) {
      if (field === "name" && looksLikePhoneOnly(value)) continue;
      return true;
    }
  }
  if (field === "name" && sanitizeActionString(contact?.name).length > 0 && !looksLikePhoneOnly(contact?.name)) return true;
  if (field === "phone" && sanitizeActionString(contact?.number).length > 0) return true;
  if (field === "email" && sanitizeActionString(contact?.email).length > 0) return true;
  return false;
}

function missingRequiredFields(
  action: PromptSmartAction,
  variables: Record<string, unknown>,
  contact: Contact
): string[] {
  return configuredRequiredFields(action).filter((field) => !hasActionValue(field, variables, contact));
}

function normalizePatternList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeActionString(item, 160))
    .filter(Boolean)
    .slice(0, 40);
}

export async function listPromptSmartActionTools(
  prompt: Prompt,
  companyId: number
): Promise<PromptSmartActionToolMetadata[]> {
  const actions = await PromptSmartAction.findAll({
    where: smartActionWhereForRuntime(prompt, companyId) as any,
    order: [["id", "ASC"]]
  });

  return actions
    .filter((action) => action.enabled !== false)
    .map((action) => {
      const variables =
        action.variables && typeof action.variables === "object"
          ? (action.variables as Record<string, unknown>)
          : {};
      return {
        id: action.id,
        slug: sanitizeActionString(action.slug || action.type || `action_${action.id}`, 120),
        type: sanitizeActionString(action.type, 80),
        name: sanitizeActionString(action.name, 160),
        description: sanitizeActionString(action.description || action.name || action.type, 500),
        requiredFields: configuredRequiredFields(action),
        variables,
        triggerHints: {
          agent: normalizePatternList((action as any).agentTriggerPatterns),
          user: normalizePatternList((action as any).userTriggerPatterns)
        }
      };
    });
}

export async function validatePromptSmartActionToolCall(params: {
  prompt: Prompt;
  ticket: Ticket;
  contact: Contact;
  actionSlug: string;
  variables?: Record<string, unknown>;
}): Promise<{ ok: true; action: PromptSmartAction; missingFields: string[] } | { ok: false; reason: string; missingFields?: string[] }> {
  const action = await resolveSmartActionRow(
    params.prompt,
    params.ticket.companyId,
    params.actionSlug
  );
  if (!action) {
    return { ok: false, reason: `Ação "${params.actionSlug}" não encontrada.` };
  }
  if (action.enabled === false) {
    return { ok: false, reason: `Ação "${params.actionSlug}" está desabilitada.` };
  }
  const baseVars = action.variables && typeof action.variables === "object" ? (action.variables as Record<string, any>) : {};
  const mergedVars: Record<string, unknown> = {
    ...memoryActionVariables(params.ticket, params.contact, params.prompt.id),
    ...baseVars,
    ...(params.variables && typeof params.variables === "object" ? params.variables : {})
  };
  const missing = missingRequiredFields(action, mergedVars, params.contact);
  if (missing.length) {
    return { ok: false, reason: `Campos obrigatórios ausentes: ${missing.join(", ")}.`, missingFields: missing };
  }
  return { ok: true, action, missingFields: [] };
}

async function buildConversationSummary(ticket: Ticket, maxTurns = 10): Promise<string> {
  try {
    const rows = await Message.findAll({
      where: { ticketId: ticket.id },
      order: [["createdAt", "DESC"]],
      limit: maxTurns
    });
    return rows
      .reverse()
      .map((m: any) => {
        const who = m.fromMe ? "Agente" : "Cliente";
        const body = sanitizeActionString(m.body || "", 240);
        return body ? `${who}: ${body}` : "";
      })
      .filter(Boolean)
      .join("\n");
  } catch (e) {
    logger.warn(`[SMART ACTION] não foi possível resumir conversa ticket=${ticket.id}`, e as any);
    return "";
  }
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const s = sanitizeActionString(value, 240);
    if (s) return s;
  }
  return "";
}

async function resolveSmartActionRow(
  prompt: Prompt,
  companyId: number,
  logicalSlug: string,
  opts?: { smartActionId?: number; scriptSlug?: string }
): Promise<PromptSmartAction | null> {
  const scopeWhere = smartActionWhereForRuntime(prompt, companyId) as any;
  if (opts?.smartActionId != null && Number.isFinite(Number(opts.smartActionId))) {
    const byId = await PromptSmartAction.findOne({
      where: { id: Number(opts.smartActionId), ...scopeWhere }
    });
    if (byId) return byId;
  }
  const trySlug = String(logicalSlug || "").trim();
  if (trySlug) {
    const direct = await PromptSmartAction.findOne({
      where: { ...scopeWhere, slug: trySlug }
    });
    if (direct) return direct;
    const tsl = trySlug.toLowerCase();
    if (tsl === "agendar" || tsl === "marcarhorario" || tsl === "marcar_horario") {
      const byCanonical = await PromptSmartAction.findOne({
        where: { ...scopeWhere, slug: "agendamento" }
      });
      if (byCanonical) return byCanonical;
      const allAg = await PromptSmartAction.findAll({ where: scopeWhere });
      const byTypeAg = allAg.find((a) => String(a.type || "").toLowerCase() === "agendamento");
      if (byTypeAg) return byTypeAg;
    }
  }
  const script = String(opts?.scriptSlug || "").trim();
  if (script && script !== trySlug) {
    const byScript = await PromptSmartAction.findOne({
      where: { ...scopeWhere, slug: script }
    });
    if (byScript) return byScript;
  }
  if (isTransferAlias(trySlug) || isTransferAlias(script)) {
    const all = await PromptSmartAction.findAll({ where: scopeWhere });
    if (script) {
      const exact = all.find((a) => String(a.slug || "").toLowerCase() === script.toLowerCase());
      if (exact) return exact;
    }
    const byT = all.find((a) => String(a.type || "").toLowerCase() === "transferir");
    if (byT) return byT;
    const bySlug = all.find((a) => isTransferAlias(String(a.slug || "")));
    if (bySlug) return bySlug;
  }
  return null;
}

function inferHandlerBranch(action: PromptSmartAction, logicalSlug: string): string {
  const t = String(action.type || "").toLowerCase();
  const s = String(action.slug || "").toLowerCase();
  const log = String(logicalSlug || "").toLowerCase();
  if (log === "agendar" || log === "marcarhorario" || log === "marcar_horario") {
    return "agendamento";
  }
  const byType: Record<string, string> = {
    transferir: "transferirChamado",
    criar_lead: "criarLead",
    criar_contato: "criarContato",
    preco: "passarPreco",
    enviar_link: "enviarLink",
    consultar_agenda: "consultarAgenda",
    ticket: "criarAtividade",
    criar_atividade: "criarAtividade",
    agendamento: "agendamento",
    consultar_produtos: "consultarProdutos",
    consultar_estoque: "consultarEstoque",
    enviar_link_produto: "enviarLinkProduto",
    registrar_intencao_compra: "registrarIntencaoCompra"
  };
  if (byType[t]) return byType[t];
  if (/transfer/.test(s) || isTransferAlias(s)) return "transferirChamado";
  return String(logicalSlug || "").trim() || String(action.slug || "");
}

export async function executeSmartAction(
  actionSlug: string,
  prompt: Prompt,
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>,
  opts?: { smartActionId?: number; scriptSlug?: string; attendanceFlowStep?: number }
): Promise<ActionExecutionResult> {
  try {
    const action = await resolveSmartActionRow(prompt, ticket.companyId, actionSlug, opts);

    if (!action) {
      return {
        success: false,
        message: `Ação "${actionSlug}" não encontrada para este agente`
      };
    }

    const baseVars = (action.variables && typeof action.variables === "object" ? action.variables : {}) as Record<
      string,
      unknown
    >;
    const colResponse =
      action.responseMessage != null ? String(action.responseMessage).trim() : "";
    const mergedVars: Record<string, unknown> = {
      ...memoryActionVariables(ticket, contact, prompt.id),
      ...baseVars,
      ...(variables && typeof variables === "object" ? variables : {})
    };
    if (
      colResponse &&
      !String((mergedVars.responseMessage ?? mergedVars.msgTransfer ?? "") as string).trim()
    ) {
      mergedVars.responseMessage = colResponse;
    }

    const branch = inferHandlerBranch(action, actionSlug);
    const isScheduleBranch = branch === "agendamento";
    if (isScheduleBranch && !scheduleExecutionAuthorized(mergedVars)) {
      logger.info(
        `[SMART ACTION] agendamento bloqueado — ticket ${ticket.id} (sem data/horário na mensagem ou variáveis)`
      );
      return {
        success: false,
        message:
          "Informe dia e horário para o agendamento (ex.: 12/05 às 15h ou amanhã às 10h)."
      };
    }
    const fromScriptFlow =
      opts?.attendanceFlowStep != null || Boolean(String(opts?.scriptSlug || "").trim());
    const userPatterns = Array.isArray((action as any).userTriggerPatterns)
      ? ((action as any).userTriggerPatterns as unknown[]).map((p) => String(p || ""))
      : [];
    const agentPatterns = Array.isArray((action as any).agentTriggerPatterns)
      ? ((action as any).agentTriggerPatterns as unknown[]).map((p) => String(p || ""))
      : [];
    const inboundText = String(
      mergedVars.lastUserMessage || mergedVars.customerReply || mergedVars.lastUserAnswer || ""
    );
    const lastAssistantText = String(mergedVars.lastAssistantQuestion || "");

    if (branch === "criarLead" && !mergedVars.leadAuthorized && !fromScriptFlow) {
      if (
        !leadExecutionAuthorized({
          userText: inboundText,
          lastAssistantText,
          userTriggerPatterns: userPatterns,
          agentTriggerPatterns: agentPatterns
        })
      ) {
        logger.info(
          `[SMART ACTION] criar lead bloqueado — ticket ${ticket.id} (sem gatilho configurado na conversa)`
        );
        return { success: false, message: "" };
      }
    }
    if (branch === "criarAtividade" && !mergedVars.activityAuthorized && !fromScriptFlow) {
      if (
        !activityExecutionAuthorized({
          userText: inboundText,
          lastAssistantText,
          userTriggerPatterns: userPatterns,
          agentTriggerPatterns: agentPatterns
        })
      ) {
        logger.info(
          `[SMART ACTION] criar atividade bloqueado — ticket ${ticket.id} (sem gatilho configurado na conversa)`
        );
        return { success: false, message: "" };
      }
    }

    const isTransferBranch =
      branch === "transferirChamado" || branch === "transferirAtendimento";
    if (
      isTransferBranch &&
      !transferExecutionAuthorized({
        transferAuthorized: mergedVars.transferAuthorized,
        userRequestedTransfer: mergedVars.userRequestedTransfer,
        assistantDeclaredTransfer: mergedVars.assistantDeclaredTransfer,
        scriptTransferWithDeclaration: mergedVars.scriptTransferWithDeclaration
      })
    ) {
      logger.info(
        `[SMART ACTION] transferência bloqueada — ticket ${ticket.id} (sem declaração do agente nem pedido explícito do cliente)`
      );
      return {
        success: false,
        message:
          "Transferência só é feita quando o agente avisa que vai transferir ou quando o cliente pede atendimento humano."
      };
    }
    const missing = missingRequiredFields(action, mergedVars, contact);
    if (missing.length) {
      logger.info(
        `[SMART ACTION] campos obrigatórios ausentes action=${action.id} slug=${action.slug} ticket=${ticket.id}: ${missing.join(",")}`
      );
      return {
        success: false,
        message: `Antes de executar essa ação, preciso de: ${missing.join(", ")}.`,
        data: { missingFields: missing }
      };
    }
    const stepPart =
      opts?.attendanceFlowStep != null && Number.isFinite(Number(opts.attendanceFlowStep))
        ? `:s${Number(opts.attendanceFlowStep)}`
        : "";
    const slugPart = opts?.scriptSlug ? `:${String(opts.scriptSlug)}` : "";
    const dedupKey = `${action.id}:${branch}${stepPart}${slugPart}`;

    const dw = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
    const agentState = (dw.agentState || {}) as {
      lastHandledAction?: string;
      lastHandledAt?: string;
      lastHandledOutcome?: "success" | "failure";
    };

    /**
     * Dedup: só pula se a execução anterior FOI um sucesso. Se falhou, deixa tentar de novo
     * — caso contrário um erro transitório (DB, parse) trava a ação para sempre nesse turno.
     */
    if (
      agentState.lastHandledAction === dedupKey &&
      agentState.lastHandledAt &&
      agentState.lastHandledOutcome === "success"
    ) {
      const lastAt = new Date(agentState.lastHandledAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastAt.getTime()) / (1000 * 60);
      if (diffMinutes < 5) {
        logger.info(`[SMART ACTION] Ação ${dedupKey} já executada com sucesso recente, pulando`);
        logger.info(
          JSON.stringify({
            evt: "smart_action_dedup_skip",
            ticketId: ticket.id,
            promptId: prompt.id,
            companyId: ticket.companyId,
            smartActionId: action.id,
            slug: action.slug,
            branch,
            reason: "recent_success"
          })
        );
        return { success: true, message: "", data: null };
      }
    }

    logger.info(
      JSON.stringify({
        evt: "smart_action_execute",
        ticketId: ticket.id,
        promptId: prompt.id,
        companyId: ticket.companyId,
        smartActionId: action.id,
        slug: action.slug,
        branch,
        source: opts?.attendanceFlowStep != null ? "roteiro" : opts?.scriptSlug ? "intent_or_script" : "direct"
      })
    );

    let result: ActionExecutionResult;

    switch (branch) {
      case "consultarProdutos":
        result = await handleConsultarProdutos(ticket.companyId, mergedVars, ticket, prompt);
        break;
      case "passarPreco":
        result = await handlePassarPreco(ticket.companyId, mergedVars, ticket, prompt);
        break;
      case "consultarEstoque":
        result = await handleConsultarEstoque(ticket.companyId, mergedVars, ticket, prompt);
        break;
      case "enviarLinkProduto":
        result = await handleEnviarLinkProduto(ticket.companyId, mergedVars, ticket, prompt);
        break;
      case "registrarIntencaoCompra":
        result = await handleRegistrarIntencaoCompra(ticket.companyId, mergedVars, ticket, prompt);
        break;
      case "criarLead":
        result = await handleCriarLead(ticket, contact, mergedVars);
        break;
      case "criarContato":
        result = await handleCriarContato(ticket, contact, mergedVars);
        break;
      case "consultarAgenda":
      case "verificarAgenda":
        result = await handleConsultarAgenda(ticket, contact, mergedVars);
        break;
      case "criarAtividade":
        result = await handleCriarAtividade(ticket, contact, mergedVars);
        break;
      case "transferirChamado":
      case "transferirAtendimento":
        result = await handleTransferirChamado(ticket, contact, mergedVars, prompt);
        break;
      case "agendamento":
        result = await handleAgendamento(ticket, contact, mergedVars);
        break;
      case "atenderChamado":
        result = await handleAtenderChamado(ticket, contact, mergedVars);
        break;
      case "enviarLink":
      case "enviar_link":
        result = await handleEnviarLink(ticket, contact, mergedVars);
        break;
      default:
        result = {
          success: false,
          message: `Ação "${branch}" não implementada`
        };
    }

    try {
      const nextDw = {
        ...dw,
        agentState: {
          ...agentState,
          lastHandledAction: dedupKey,
          lastHandledAt: new Date().toISOString(),
          lastHandledOutcome: (result.success ? "success" : "failure") as "success" | "failure"
        }
      };
      await (ticket as any).update({ dataWebhook: nextDw } as any);
      (ticket as any).setDataValue("dataWebhook", nextDw);
    } catch (e) {
      logger.warn("[SMART ACTION] falha ao persistir agentState", e);
    }

    if (!result.success) {
      logger.warn(
        `[SMART ACTION] ${dedupKey} falhou: ${result.message || "(sem mensagem)"}`
      );
    }
    logger.info(
      JSON.stringify({
        evt: result.success ? "smart_action_success" : "smart_action_failure",
        ticketId: ticket.id,
        promptId: prompt.id,
        companyId: ticket.companyId,
        smartActionId: action.id,
        slug: action.slug,
        branch,
        outcome: result.success ? "success" : "failure"
      })
    );

    return result;
  } catch (error) {
    logger.error(`[SMART ACTION] Erro ao executar ação ${actionSlug}:`, error);
    return {
      success: false,
      message: "Não foi possível concluir essa ação agora."
    };
  }
}

async function handleConsultarProdutos(
  companyId: number,
  variables?: Record<string, unknown>,
  ticket?: Ticket,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  const products = await findInventoryProductsForAgent({
    companyId,
    prompt,
    variables,
    limit: 20
  });
  const catalog = buildCatalogMessage(products, 12);
  const cfg = getAgentInventoryConfig(prompt);
  const hint =
    cfg.reply?.resumeHint && cfg.reply?.resumeHintText
      ? `\n\n${cfg.reply.resumeHintText}`
      : "";

  if (ticket) {
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "consultar_produtos"
    });
  }

  return {
    success: true,
    message: `${catalog}${hint}`.trim(),
    data: products
  };
}

async function handlePassarPreco(
  companyId: number,
  variables?: Record<string, unknown>,
  ticket?: Ticket,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  const products = await findInventoryProductsForAgent({
    companyId,
    prompt,
    variables,
    limit: 5
  });
  const product = products[0];
  if (!product) {
    return { success: false, message: "Produto não encontrado" };
  }
  const cfg = getAgentInventoryConfig(prompt);
  const reply = resolveReplyForProduct(cfg, product);
  const message = formatInventoryAgentReply({ product, reply });

  if (ticket) {
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "passar_preco"
    });
    try {
      await sendInventoryReplyMedia({ ticket, product, reply });
    } catch (e) {
      logger.warn("[SMART ACTION] passarPreco media:", e as any);
    }
  }

  return { success: true, message, data: product };
}

async function handleConsultarEstoque(
  companyId: number,
  variables?: Record<string, unknown>,
  ticket?: Ticket,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  const products = await findInventoryProductsForAgent({
    companyId,
    prompt,
    variables,
    limit: 5
  });
  const product = products[0];
  if (!product) {
    return { success: false, message: "Produto não encontrado no estoque" };
  }
  const cfg = getAgentInventoryConfig(prompt);
  const reply = resolveReplyForProduct(cfg, product);
  const status = stockStatusLabel(product.status, product.quantity);
  const hint =
    reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : "";
  const message = `Sobre *${product.name}*: está ${status} (${product.quantity} un.).${hint}`;

  if (ticket) {
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "consultar_estoque"
    });
    try {
      await sendInventoryReplyMedia({ ticket, product, reply });
    } catch (e) {
      logger.warn("[SMART ACTION] consultarEstoque media:", e as any);
    }
  }

  return { success: true, message, data: product };
}

async function handleEnviarLinkProduto(
  companyId: number,
  variables?: Record<string, unknown>,
  ticket?: Ticket,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  const products = await findInventoryProductsForAgent({
    companyId,
    prompt,
    variables,
    limit: 5
  });
  const product = products[0];
  if (!product) {
    return { success: false, message: "Produto não encontrado" };
  }
  const cfg = getAgentInventoryConfig(prompt);
  const reply = resolveReplyForProduct(cfg, product);
  const link = product.buyLink || "";
  const hint =
    reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : "";
  const message = link
    ? `Segue o link de compra do *${product.name}*:\n${link}${hint}`
    : `Ainda não temos link de compra cadastrado para *${product.name}*. Posso te ajudar de outra forma?`;

  if (ticket) {
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "enviar_link_produto"
    });
    try {
      await sendInventoryReplyMedia({ ticket, product, reply });
    } catch (e) {
      logger.warn("[SMART ACTION] enviarLinkProduto media:", e as any);
    }
  }

  return { success: true, message, data: { product, link } };
}

async function handleRegistrarIntencaoCompra(
  companyId: number,
  variables?: Record<string, unknown>,
  ticket?: Ticket,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  const products = await findInventoryProductsForAgent({
    companyId,
    prompt,
    variables,
    limit: 5
  });
  const product = products[0];
  if (!product) {
    return { success: false, message: "Produto não encontrado para registrar intenção" };
  }
  const cfg = getAgentInventoryConfig(prompt);
  const reply = resolveReplyForProduct(cfg, product);

  if (ticket) {
    try {
      const dw = ((ticket as any).dataWebhook || {}) as Record<string, unknown>;
      const agentState = ((dw.agentState || {}) as Record<string, unknown>) || {};
      const nextDw = {
        ...dw,
        agentState: {
          ...agentState,
          purchaseIntent: {
            productId: product.id,
            productName: product.name,
            at: new Date().toISOString()
          }
        }
      };
      await (ticket as any).update({ dataWebhook: nextDw });
      (ticket as any).setDataValue("dataWebhook", nextDw);
    } catch (e) {
      logger.warn("[SMART ACTION] registrarIntencaoCompra persist:", e as any);
    }
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "registrar_intencao_compra"
    });
  }

  const hint =
    reply.resumeHint && reply.resumeHintText ? `\n\n${reply.resumeHintText}` : "";
  const message = `Anotei seu interesse em *${product.name}*. Nossa equipe pode seguir com a compra.${hint}`;

  return { success: true, message, data: { product, stockUnchanged: true } };
}

async function resolveLeadPipelineLabels(
  companyId: number,
  variables?: Record<string, unknown>
): Promise<{ pipeline?: string; stage?: string }> {
  const out: { pipeline?: string; stage?: string } = {};
  if (!variables) return out;
  const pid = variables.pipelineId != null ? Number(variables.pipelineId) : NaN;
  const sid = variables.stageId != null ? Number(variables.stageId) : NaN;
  try {
    if (Number.isFinite(pid) && pid > 0) {
      const p = await LeadPipeline.findOne({ where: { id: pid, companyId } });
      if (p?.name) out.pipeline = sanitizeActionString(p.name, 120);
    }
    if (Number.isFinite(sid) && sid > 0) {
      const s = await LeadPipelineStage.findOne({ where: { id: sid, companyId } });
      const label = s?.label || s?.key;
      if (label) out.stage = sanitizeActionString(label, 120);
    }
  } catch (e) {
    logger.warn("[SMART ACTION] resolveLeadPipelineLabels falhou", e as any);
  }
  return out;
}

async function handleCriarLead(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const summary = await buildConversationSummary(ticket);
  const phone = firstNonEmpty(variables?.phone, variables?.contactPhone, contact.number);
  const name = firstNonEmpty(
    variables?.name,
    looksLikePhoneOnly(contact.name) ? "" : contact.name,
    "Lead WhatsApp"
  );
  const funnel = await resolveLeadPipelineLabels(ticket.companyId, variables);
  const leadContext = [
    "Origem: WhatsApp",
    funnel.pipeline ? `Pipeline: ${funnel.pipeline}` : "",
    funnel.stage ? `Etapa: ${funnel.stage}` : "",
    variables?.description ? String(variables.description) : "",
    summary ? `Resumo da conversa:\n${summary}` : "",
    variables?.company ? `Empresa: ${variables.company}` : "",
    variables?.city ? `Cidade: ${variables.city}` : "",
    variables?.interest ? `Interesse: ${variables.interest}` : "",
    phone ? `Telefone: ${phone}` : "",
    variables?.lastUserAnswer ? `Última resposta útil: ${variables.lastUserAnswer}` : ""
  ].filter(Boolean).join("\n");
  const lead = await CreateConvertedLeadService({
    name,
    description: leadContext || `Lead criado pelo agente IA via WhatsApp (ticket #${ticket.id})`,
    email: variables?.email as string || contact.email || null,
    address: variables?.address as string || variables?.city as string || null,
    sector: "WhatsApp",
    contactId: contact.id,
    responsibleId: variables?.responsibleId as number || null,
    companyId: ticket.companyId
  });

  await CreateLogTicketService({
    userId: null,
    ticketId: ticket.id,
    type: "lead_created"
  });

  return {
    success: true,
    message: "",
    data: lead
  };
}

async function handleCriarContato(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const name = sanitizeActionString(variables?.name || variables?.contactName || contact.name || "Contato WhatsApp", 120);
  const number = sanitizeActionString(variables?.phone || variables?.number || variables?.contactPhone || contact.number, 40)
    .replace(/\D/g, "");
  const email = sanitizeActionString(variables?.email || variables?.contactEmail || contact.email || "", 120);

  if (!number) {
    return {
      success: false,
      message: "Telefone é obrigatório para criar ou atualizar o contato",
      data: { missingFields: ["phone"] }
    };
  }

  const updatedContact = await CreateOrUpdateContactService({
    name,
    number,
    email,
    profilePicUrl: contact.profilePicUrl || "",
    isGroup: false,
    companyId: ticket.companyId,
    channel: "whatsapp",
    remoteJid: contact.remoteJid || "",
    whatsappId:
      variables?.whatsappId != null && Number.isFinite(Number(variables.whatsappId))
        ? Number(variables.whatsappId)
        : ticket.whatsappId || undefined
  });

  await CreateLogTicketService({
    userId: null,
    ticketId: ticket.id,
    type: "contact_created"
  });

  return {
    success: true,
    message: `Contato criado/atualizado com sucesso (ID: ${updatedContact.id})`,
    data: updatedContact
  };
}

async function handleConsultarAgenda(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const date = variables?.date as Date;
  
  await CreateLogTicketService({
    userId: null,
    ticketId: ticket.id,
    type: "consultar_agenda"
  });
  
  return {
    success: true,
    message: "Consulta de agenda implementada",
    data: { date }
  };
}

async function handleCriarAtividade(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const summary = await buildConversationSummary(ticket, 8);
  const title = firstNonEmpty(
    variables?.title,
    variables?.activityTitle,
    variables?.interest ? `Acompanhar: ${variables.interest}` : "",
    variables?.objective,
    "Atividade criada pelo agente IA"
  ).slice(0, 180);
  const description = [
    firstNonEmpty(variables?.description, variables?.activityDescription),
    summary ? `Contexto da conversa:\n${summary}` : "",
    variables?.lastUserAnswer ? `Última resposta útil: ${variables.lastUserAnswer}` : "",
    `Origem: WhatsApp | ticket #${ticket.id} | contato: ${contact.name || contact.number || contact.id}`
  ].filter(Boolean).join("\n\n");
  const responsibleRaw =
    variables?.userId != null && Number.isFinite(Number(variables.userId)) && Number(variables.userId) > 0
      ? Number(variables.userId)
      : variables?.responsibleId != null &&
          Number.isFinite(Number(variables.responsibleId)) &&
          Number(variables.responsibleId) > 0
        ? Number(variables.responsibleId)
        : null;

  let activityDate: Date | null = resolveAgendamentoWhen(variables);
  if (!activityDate) {
    activityDate = new Date();
  }
  const slotMinutes = resolveMeetingSlotMinutes(variables);
  const dateEnd = new Date(activityDate.getTime() + slotMinutes * 60 * 1000);

  const activity = await Activity.create({
    title,
    description,
    type: (variables?.type as string) || (variables?.activityType as string) || "task",
    status: (variables?.status as string) || (variables?.activityStatus as string) || "pending",
    date: activityDate,
    dateEnd,
    userId: responsibleRaw,
    companyId: ticket.companyId
  });

  await CreateLogTicketService({
    userId: null,
    ticketId: ticket.id,
    type: "activity_created"
  });

  return {
    success: true,
    message: "",
    data: activity
  };
}

async function emitAgentTransferNotice(
  ticket: Ticket,
  companyId: number,
  queueId: number,
  userId?: number | null
): Promise<void> {
  /** Não enviar texto ao cliente: a transferência já gera registro no ticket (CreateLogTicketService no UpdateTicketService) e aparece como bolha no painel, sem interromper o fio da conversa no WhatsApp. */
  try {
    const queue = await Queue.findByPk(queueId);
    const qName = queue?.name || `Fila #${queueId}`;
    logger.info(
      `[SMART ACTION] transferência ticket=${ticket.id} company=${companyId} fila=${qName} userId=${userId ?? "—"}`
    );
  } catch {
    /* noop */
  }
}

async function handleTransferirChamado(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>,
  prompt?: Prompt
): Promise<ActionExecutionResult> {
  let queueId =
    variables?.queueId != null && Number.isFinite(Number(variables.queueId))
      ? Number(variables.queueId)
      : NaN;
  let userId =
    variables?.userId != null && Number.isFinite(Number(variables.userId)) && Number(variables.userId) > 0
      ? Number(variables.userId)
      : null;

  const pq = prompt?.queueId != null ? Number(prompt.queueId) : NaN;
  if (!Number.isFinite(queueId) || queueId <= 0) {
    if (Number.isFinite(pq) && pq > 0) {
      queueId = pq;
    }
  }
  if (!Number.isFinite(queueId) || queueId <= 0) {
    const tq = ticket.queueId != null ? Number(ticket.queueId) : NaN;
    if (Number.isFinite(tq) && tq > 0) {
      queueId = tq;
    }
  }

  const whatsappRaw = variables?.whatsappId;
  const whatsappId =
    whatsappRaw != null && Number.isFinite(Number(whatsappRaw)) && Number(whatsappRaw) > 0
      ? Number(whatsappRaw)
      : null;

  if (!Number.isFinite(queueId) || queueId <= 0) {
    logger.warn(
      `[SMART ACTION] transferirChamado sem fila resolvível — ticket ${ticket.id}, vars=${JSON.stringify(variables)}`
    );
    return {
      success: false,
      message: "Configure a fila na ação inteligente ou na integração do agente."
    };
  }

  const queue = await Queue.findOne({
    where: { id: queueId, companyId: ticket.companyId }
  });
  if (!queue) {
    logger.warn(
      `[SMART ACTION] transferirChamado com fila inválida — ticket ${ticket.id}, queueId=${queueId}, company=${ticket.companyId}`
    );
    return {
      success: false,
      message: "Configure a fila na ação inteligente ou na integração do agente."
    };
  }

  if (userId != null && userId > 0) {
    const user = await User.findOne({
      where: { id: userId, companyId: ticket.companyId }
    });
    if (!user) {
      logger.warn(
        `[SMART ACTION] transferirChamado ignorando usuário inválido — ticket ${ticket.id}, userId=${userId}, company=${ticket.companyId}`
      );
      userId = null;
    }
  }

  logger.info(
    `[SMART ACTION] transferirChamado ticket=${ticket.id} queueId=${queueId} userId=${userId} whatsappId=${whatsappId}`
  );

  const customerMessage = resolveTransferCustomerMessage(variables);
  const msgTransfer = customerMessage;

  const isGroup = !!(ticket as any).isGroup;
  const status =
    !userId || userId <= 0 ? "pending" : isGroup ? "group" : "open";

  /**
   * Mesmo efeito central do nó "attendant" em Automações (ActionsWebhookService):
   * atribuir fila/usuário, encerrar modo bot/integração e limpar dataWebhook para o humano assumir.
   */
  const ticketData: Record<string, unknown> = {
    queueId,
    userId: userId || null,
    status,
    isTransfered: true,
    msgTransfer,
    useIntegration: false,
    isBot: false,
    integrationId: null,
    dataWebhook: null
  };
  if (whatsappId != null && whatsappId > 0) {
    const whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId: ticket.companyId }
    });
    if (whatsapp) {
      ticketData.whatsappId = whatsappId;
    } else {
      logger.warn(
        `[SMART ACTION] transferirChamado ignorando conexão inválida — ticket ${ticket.id}, whatsappId=${whatsappId}, company=${ticket.companyId}`
      );
    }
  }

  const { ticket: ticketAfterTransfer } = await UpdateTicketService({
    ticketData: ticketData as any,
    ticketId: ticket.id,
    companyId: ticket.companyId
  });

  try {
    await emitAgentTransferNotice(
      ticketAfterTransfer,
      ticketAfterTransfer.companyId,
      queueId,
      userId
    );
  } catch (e) {
    logger.warn(`[SMART ACTION] falha ao registrar bolha de transferência ticket ${ticket.id}`, e);
  }

  return {
    success: true,
    message: customerMessage,
    data: { queueId, userId, whatsappId, msgTransfer: customerMessage }
  };
}

function resolveAgendamentoWhen(variables?: Record<string, unknown>): Date | null {
  if (!variables) return null;
  if (variables.useNow === true || variables.scheduleNow === true) {
    return new Date();
  }
  const v = variables.date;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  const reply = variables.customerReply ?? variables.lastUserMessage;
  if (typeof reply === "string" && reply.trim()) {
    const { date, matched } = parseDateTimeFromText(reply);
    if (matched && date) return date;
  }
  return null;
}

async function handleAgendamento(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  try {
    const date = resolveAgendamentoWhen(variables);
    if (!date) {
      return {
        success: false,
        message:
          "Informe dia e horário para o agendamento (ex.: 12/05 às 15h ou amanhã às 10h)."
      };
    }
    const slotMinutes = resolveMeetingSlotMinutes(variables);
    const conflict = await findConflictingScheduleSlot(
      ticket.companyId,
      date,
      slotMinutes
    );
    if (conflict) {
      return {
        success: false,
        message:
          "Esse horário já está ocupado no calendário. Envie outro dia ou horário disponível."
      };
    }
    const pastMessages = await Message.findAll({
      where: { ticketId: ticket.id },
      order: [["createdAt", "ASC"]],
      limit: 200
    });
    const body = appendScheduleSlotMinutesMarker(
      `Reserva — ${contact.name || "Contato"} (ticket #${ticket.id})\n\nResumo do histórico recente:\n${pastMessages.map(m => `${m.fromMe ? 'Atendente/IA' : 'Cliente'}: ${m.body}`).join('\n')}`,
      slotMinutes
    );
    
    const scheduleUserId =
      variables?.responsibleId != null && Number.isFinite(Number(variables.responsibleId))
        ? Number(variables.responsibleId)
        : variables?.userId != null && Number.isFinite(Number(variables.userId))
          ? Number(variables.userId)
          : ticket.userId || undefined;

    const schedule = await CreateScheduleService({
      body,
      sendAt: date.toISOString(),
      contactId: contact.id,
      companyId: ticket.companyId,
      userId: scheduleUserId,
      ticketUserId: ticket.userId || undefined,
      queueId: ticket.queueId || undefined,
      openTicket: "disabled",
      statusTicket: "closed",
      whatsappId: ticket.whatsappId || undefined,
      ticketId: ticket.id
    });
    
    const io = getIO();
    io.of(String(ticket.companyId)).emit(`company${ticket.companyId}-schedule`, {
      action: "create",
      schedule,
      fromAgent: true
    });
    
    await CreateLogTicketService({
      userId: null,
      ticketId: ticket.id,
      type: "agendamento_criado"
    });
    
    const confirmMessage = variables?.confirmMessage as string;
    const message = confirmMessage || `Agendamento realizado com sucesso para ${format(date, "dd/MM/yyyy HH:mm")}`;
    
    return {
      success: true,
      message,
      data: schedule
    };
  } catch (error) {
    logger.error("[SMART ACTION] Erro ao criar agendamento:", error);
    return {
      success: false,
      message: "Erro ao criar agendamento"
    };
  }
}

async function handleAtenderChamado(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  try {
    const userId = variables?.userId as number || null;
    
    await UpdateTicketService({
      ticketData: {
        userId: userId || null,
        status: "open"
      },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });
    // Log de open/reopen vem do UpdateTicketService (evita bolha duplicada no ticket).

    return {
      success: true,
      message: "Chamado atendido com sucesso",
      data: { userId }
    };
  } catch (error) {
    logger.error("[SMART ACTION] Erro ao atender chamado:", error);
    return {
      success: false,
      message: "Erro ao atender chamado"
    };
  }
}

async function handleEnviarLink(
  ticket: Ticket,
  contact: Contact,
  variables?: Record<string, unknown>
): Promise<ActionExecutionResult> {
  const url = String((variables?.url as string) || "").trim();
  
  if (!url) {
    return {
      success: false,
      message: "URL é obrigatória para enviar link"
    };
  }

  const urlName = String(
    (variables?.urlName as string) ||
    (variables?.linkName as string) ||
    ""
  ).trim();
  const customText = String(
    (variables?.linkText as string) ||
    (variables?.responseMessage as string) ||
    ""
  ).trim();
  let message = customText
    ? customText
        .replace(/\{\{\s*url\s*\}\}|\{url\}/gi, url)
        .replace(/\{\{\s*(nome|name|titulo|title)\s*\}\}|\{(nome|name|titulo|title)\}/gi, urlName || "link")
    : "";
  if (message && !message.includes(url)) {
    message = `${message}\n${url}`;
  }
  if (!message) {
    message = urlName ? `${urlName}: ${url}` : url;
  }

  await CreateLogTicketService({
    userId: null,
    ticketId: ticket.id,
    type: "enviar_link"
  });
  
  return {
    success: true,
    message,
    data: { url, urlName }
  };
}
