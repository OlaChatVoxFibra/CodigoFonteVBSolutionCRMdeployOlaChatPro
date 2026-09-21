/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { MessageUpsertType, proto, WASocket } from "baileys";
import {
  convertTextToSpeechAndSaveToFile,
  getBodyMessage,
  keepOnlySpecifiedChars,
  transferQueue,
  verifyMediaMessage,
  verifyMessage,
} from "../WbotServices/wbotMessageListener";
import { isNil } from "lodash";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI, Part, Content } from "@google/generative-ai";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import TicketTraking from "../../models/TicketTraking";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";
import logger from "../../utils/logger";
import { markTicketUnderAgentAttendance } from "../TicketServices/markTicketUnderAgentAttendance";
import { OPENAI_DEFAULT_CHAT_MODEL, OPENAI_DEFAULT_FAST_MODEL } from "../../config/openAiDefaults";
import { getWbot } from "../../libs/wbot";
import { getJidOf, resolveReplyJid } from "../WbotServices/getJidOf";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import CreateScheduleService from "../ScheduleServices/CreateService";
import ShowFileService from "../FileServices/ShowService";
import { getIO } from "../../libs/socket";
import { format } from "date-fns";
import Queue from "../../models/Queue";
import QueueIntegrations from "../../models/QueueIntegrations";
import User from "../../models/User";
import UserQueue from "../../models/UserQueue";
import Whatsapp from "../../models/Whatsapp";
import axios from "axios";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import { onAgentUserInboundText } from "../AgentProactiveServices/onUserInboundAgent";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { sendProactiveContextMediaAfterText } from "../AgentProactiveServices/proactiveSendContextMedia";
import { buildBeforeMediaHintForPrompt } from "../AgentProactiveServices/proactiveOpenAi";
import { parseDateTimeFromText } from "../../helpers/parseDateTimeFromText";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  parseAgentProactiveSettings,
  AgentProactiveSettings,
  ProactiveMissionMode,
  ContextualLink
} from "../../types/agentProactiveSettings";
import { fetchPageTextSnippet } from "../../utils/fetchPageTextSnippet";
import { resolveOwnedPromptBlobsForRuntime } from "../../helpers/promptJsonOwner";
import { buildWhatsappPromptScopePreamble as buildWhatsappPromptScopePreambleFn } from "../../helpers/whatsappPromptPreamble";
import { buildWhereForConnectionAgentHistory } from "../../helpers/connectionAiMessageHistory";
import { logAiCallDebug } from "../../helpers/aiCallDebugLog";

type Session = WASocket & {
  id?: number;
};

interface IOpenAi {
  name: string;
  prompt: string;
  voice: string;
  voiceKey: string;
  voiceRegion: string;
  maxTokens: number;
  temperature: number;
  apiKey: string;
  /** Fila opcional no cadastro do prompt; a fila efetiva do atendimento vem da conexão (ticket). */
  queueId?: number | null;
  maxMessages: number;
  model: string;
  provider?: "openai" | "gemini";

  /**
   * Quando true (IA disparada por nó do Flow Builder / integração), o sistema NÃO injeta
   * personalidade global (agent_role), cérebro global (agent_brain) nem blocos corporativos —
   * apenas o texto configurado no nó + regras mínimas de formato. Evita “vazar” outro agente.
   */
  flowScoped?: boolean;

  /**
   * Quando preenchido, substitui inteiramente o system prompt montado pelo serviço
   * (uso: visão/mídia no WhatsApp com o mesmo isolamento do agente vinculado à conexão).
   */
  systemPromptOverride?: string;

  /**
   * Quando definido (objeto, possivelmente vazio), destinos de transferência vêm só deste agente.
   * Omitido = compatibilidade com Flow Builder (usa agent_actions global em Settings).
   */
  agentActionsScoped?: Record<string, any>;

  /**
   * ID do Prompt (agente da conexão). Quando definido, o histórico carregado para o modelo
   * respeita `connectionAiContext` do ticket (âncora por agente), evitando misturar outro agente.
   */
  connectionPromptId?: number;

  // Campos para controle de fluxo
  flowMode?: "permanent" | "temporary";
  maxInteractions?: number;
  continueKeywords?: string[];
  completionTimeout?: number;
  objective?: string;
  autoCompleteOnObjective?: boolean;

  // Parâmetros avançados
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[] | string;
}

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};

/** Destino de transferência: mesma regra do fluxo de integração (Ações do agente > fila do prompt). */
export async function getResolvedTransferTargetForCompany(
  companyId: number,
  fallbackQueueId: number
): Promise<{ queueId: number | null; userId?: number }> {
  const agentActions = await loadAgentActionsSetting(companyId);
  return resolveAgentTransferTarget({ queueId: fallbackQueueId } as IOpenAi, agentActions, null);
}

/** Fila efetiva quando só o usuário foi configurado na ação: fila atual do ticket ou primeira fila do usuário na empresa. */
async function resolveQueueIdWhenTransferringToUserOnly(
  companyId: number,
  ticket: Ticket,
  userId: number
): Promise<number | null> {
  const tq = ticket.queueId != null ? Number(ticket.queueId) : NaN;
  if (Number.isFinite(tq) && tq > 0) {
    return tq;
  }
  const row = await UserQueue.findOne({
    where: { userId },
    include: [
      {
        model: Queue,
        attributes: ["id"],
        required: true,
        where: { companyId }
      }
    ],
    order: [["id", "ASC"]]
  });
  return row?.queueId != null && row.queueId > 0 ? row.queueId : null;
}

/**
 * Aplica transferência usando apenas ações configuradas no cadastro deste Prompt
 * (produtividade.actions) e/ou fila do agente — não usa agent_actions global da empresa.
 */
export async function applyPromptIntegrationAgentTransfer(
  ticket: Ticket,
  contact: Contact,
  promptQueueId: number | null | undefined,
  prompt: { produtividade?: unknown }
): Promise<void> {
  const agentActions = getAgentActionsFromPromptProdutividade(prompt);
  const pq = promptQueueId != null ? Number(promptQueueId) : NaN;
  const fq = Number.isFinite(pq) && pq > 0 ? pq : 0;
  const { queueId, userId } = resolveAgentTransferTarget(
    { queueId: fq } as IOpenAi,
    agentActions,
    ticket.queueId
  );
  await applyResolvedAgentTransferToTicket(ticket, contact, queueId, userId);
}

/** Há fila ou usuário de destino para transferência neste prompt (ação + integração). */
export function isPromptIntegrationTransferConfigured(
  prompt: { produtividade?: unknown; queueId?: number | null },
  ticketQueueFallback?: number | null
): boolean {
  const agentActions = getAgentActionsFromPromptProdutividade(prompt);
  const pq = prompt.queueId != null ? Number(prompt.queueId) : NaN;
  const fq = Number.isFinite(pq) && pq > 0 ? pq : 0;
  const { queueId, userId } = resolveAgentTransferTarget(
    { queueId: fq } as IOpenAi,
    agentActions,
    ticketQueueFallback != null ? Number(ticketQueueFallback) : null
  );
  return (queueId != null && Number(queueId) > 0) || (userId != null && Number(userId) > 0);
}

async function applyResolvedAgentTransferToTicket(
  ticket: Ticket,
  contact: Contact,
  queueId: number | null | undefined,
  userId?: number
): Promise<void> {
  if (queueId != null && Number(queueId) > 0) {
    await transferQueue(Number(queueId), ticket, contact, userId);
    return;
  }
  const uid = userId != null ? Number(userId) : NaN;
  if (Number.isFinite(uid) && uid > 0) {
    const q = await resolveQueueIdWhenTransferringToUserOnly(ticket.companyId, ticket, uid);
    if (q != null && q > 0) {
      await transferQueue(q, ticket, contact, uid);
    } else {
      logger.warn(
        `[AI SERVICE] Transferência: usuário ${uid} configurado mas sem fila resolvida (ticket ${ticket.id}, empresa ${ticket.companyId}).`
      );
    }
  }
}

// Persistência: chaves agent_* em Settings (JSON por empresa). Alternativa futura: tabelas dedicadas.
async function loadAgentActionsSetting(companyId: number): Promise<Record<string, any>> {
  try {
    const row = await ListSettingsServiceOne({ companyId, key: "agent_actions" });
    if (!row?.value) return {};
    return typeof row.value === "string" ? JSON.parse(row.value as string) : (row.value as any) || {};
  } catch {
    return {};
  }
}

/** Resumo linear do ticket para corpo de agendamento / contexto (não enviado ao modelo). */
function buildTicketTranscriptSummary(messages: Message[], maxChars = 2800): string {
  const lines: string[] = [];
  let n = 0;
  for (const m of messages || []) {
    const body = String(m.body || "").trim();
    if (!body) continue;
    const who = m.fromMe ? "Atendente/IA" : "Cliente";
    lines.push(`${who}: ${body}`);
    n += lines[lines.length - 1].length + 1;
    if (n >= maxChars) break;
  }
  const joined = lines.join("\n");
  return joined.length <= maxChars ? joined : `${joined.slice(0, maxChars)}…`;
}

function buildScheduleMessageBody(params: {
  ticket: Ticket;
  contact: Contact;
  bodyMessage: string;
  pastMessages: Message[];
}): string {
  const { ticket, contact, bodyMessage, pastMessages } = params;
  const name = (contact.name || "Contato").trim() || "Contato";
  const summary = buildTicketTranscriptSummary(pastMessages, 2600);
  const trigger = String(bodyMessage || "").trim().slice(0, 400);
  const parts = [
    `Reunião — ${name} (ticket #${ticket.id})`,
    "",
    "Resumo do histórico recente:",
    summary || "(sem mensagens anteriores no ticket)",
    "",
    `Pedido/data detectados na última mensagem: ${trigger || "(vazio)"}`
  ];
  let body = parts.join("\n");
  if (body.length < 5) body = `Reunião — ${name} (ticket #${ticket.id})`;
  return body.slice(0, 12000);
}

const ACTION_TRIGGER_LABELS: Record<string, string> = {
  meeting_intent: "Cliente fala em reunião, agenda, data ou horário",
  price_intent: "Pergunta preço, valor, orçamento ou plano",
  human_request: "Pedido explícito de atendente ou humano",
  order_intent: "Pedido, status de compra ou entrega",
  lead_intent: "Quer ser contato, cadastro ou proposta",
  company_intent: "Dados de empresa, CNPJ ou razão social",
  qualify_signal: "Sinais de interesse (fit, necessidade, prazo)",
  silence_followup: "Cliente sumiu ou não respondeu",
  objection: "Objeção ou dúvida bloqueando avanço",
  upsell_signal: "Momento para add-on, upgrade ou pacote"
};

const ACTION_CONTEXT_LABELS: Record<string, string> = {
  ctx_sales: "Contexto comercial / vendas",
  ctx_support: "Suporte técnico ou dúvida de uso",
  ctx_post_sale: "Pós-venda / relacionamento",
  ctx_new_lead: "Lead novo / primeiro contato",
  ctx_existing: "Cliente já ativo ou recorrente",
  ctx_urgent: "Urgência ou prazo curto",
  ctx_neutral: "Neutro / a definir na conversa"
};

function labelIds(ids: string[], map: Record<string, string>): string {
  return (ids || [])
    .map((id) => map[id] || id)
    .filter(Boolean)
    .join("; ");
}

type DestHintOpts = { userLabel?: "responsible" | "user" };

async function resolveDestinationHints(
  companyId: number,
  cfg: Record<string, unknown> | null | undefined,
  opts?: DestHintOpts
): Promise<string | null> {
  if (!cfg || typeof cfg !== "object") return null;
  const parts: string[] = [];
  const qid = Number((cfg as any).queueId);
  if (Number.isFinite(qid) && qid > 0) {
    const q = await Queue.findOne({ where: { id: qid, companyId } });
    if (q) parts.push(`fila \"${q.name}\"`);
  }
  const iid = Number((cfg as any).queueIntegrationId);
  if (Number.isFinite(iid) && iid > 0) {
    const integ = await QueueIntegrations.findOne({ where: { id: iid, companyId } });
    if (integ) {
      const typ = String(integ.type || "").trim();
      parts.push(
        `integração/chatbot \"${integ.name}\"${typ ? ` (${typ})` : ""}`
      );
    }
  }
  const uid = Number((cfg as any).userId);
  if (Number.isFinite(uid) && uid > 0) {
    const u = await User.findOne({ where: { id: uid, companyId } });
    if (u) {
      const ul =
        opts?.userLabel === "responsible"
          ? "responsável preferencial"
          : "usuário preferencial";
      parts.push(`${ul} \"${u.name}\"`);
    }
  }
  if (!parts.length) return null;
  return parts.join("; ");
}

async function buildAgentActionsPromptBlock(
  companyId: number,
  agentActions: Record<string, any>
): Promise<string> {
  const enabled = Array.isArray(agentActions?.enabled) ? agentActions.enabled : [];
  if (!enabled.length) return "";
  const lines: string[] = [
    `Ações habilitadas pelo operador (use quando fizer sentido; não simule execução fora do que o sistema já faz): ${enabled.join(", ")}.`
  ];
  const perAction = agentActions?.perAction && typeof agentActions.perAction === "object" ? agentActions.perAction : {};

  for (const name of enabled) {
    const cfg = perAction[name];
    const triggers: string[] = Array.isArray(cfg?.triggers) ? cfg.triggers : [];
    const contexts: string[] = Array.isArray(cfg?.contexts) ? cfg.contexts : [];
    const tLine = triggers.length ? labelIds(triggers, ACTION_TRIGGER_LABELS) : "(gatilhos não especificados — use o bom senso da ação)";
    const cLine = contexts.length ? labelIds(contexts, ACTION_CONTEXT_LABELS) : "";
    let line = `• ${name}: priorize quando ${tLine}${cLine ? `. Enquadre o tom como: ${cLine}.` : "."}`;
    const dest = await resolveDestinationHints(companyId, cfg as any, {
      userLabel: "responsible"
    });
    if (dest) {
      line += ` Referência no sistema (definida pelo operador): ${dest}.`;
    }
    lines.push(line);
  }

  if (enabled.includes("Agendamento")) {
    lines.push(
      "Agendamento (sistema): quando houver data/hora explícitas combinadas na mensagem, o compromisso pode ser registrado automaticamente — confirme o horário de forma clara."
    );
  }
  if (enabled.includes("Transferir Chamado")) {
    const tc = agentActions?.transferChamado;
    const transferHints = await resolveDestinationHints(companyId, tc, {
      userLabel: "user"
    });
    lines.push(
      `Transferir chamado: o operador deve ter definido fila de destino e/ou usuário de destino (pelo menos um). Quando precisar encaminhar a um humano, use exatamente a frase indicada nas instruções do sistema para transferência.${
        transferHints ? ` Destino preferido pelo operador: ${transferHints}.` : ""
      }`
    );
  }
  return `\n\n--- Ações do agente ---\n${lines.join("\n")}\n--- Fim ações ---`;
}

async function buildBrainKnowledgePromptBlock(
  companyId: number,
  brainValue: Record<string, any> | null
): Promise<string> {
  if (!brainValue || brainValue.includeKnowledgeInPrompt === false) return "";
  const parts: string[] = [];
  parts.push(
    [
      "Núcleo cognitivo do agente:",
      "- Use o Cérebro como camada de interpretação, memória e continuidade, não como menu estático.",
      "- Antes de responder, consolide mentalmente: objetivo do cliente, etapa atual, dados já coletados, pendências, intenção implícita e próxima ação útil.",
      "- Leia Regras Gerais como comportamento obrigatório e Roteiro como mapa operacional; nunca copie blocos internos do roteiro para o cliente.",
      "- Saiba sempre o que você está fazendo agora: qual etapa está ativa, por que ela existe, qual dado foi respondido e qual dado falta.",
      "- Interprete linguagem natural por significado: datas aproximadas, períodos, confirmações curtas, objeções, correções e referências a mensagens anteriores contam como contexto válido.",
      "- Nunca repita perguntas cujas respostas já estejam no histórico, no estado do roteiro ou na memória consolidada do ticket.",
      "- Se detectar que a conversa está em loop, pare de repetir a etapa e use os dados já coletados para avançar com uma fala curta.",
      "- Para criar lead, tarefa/atividade ou contato, use dados coletados naturalmente na conversa; pergunte só campos essenciais ausentes.",
      "- Em lead, nome e telefone são essenciais; descrição deve resumir o que ocorreu e marcar origem WhatsApp.",
      "- Em tarefa/atividade, campos configurados pelo operador têm prioridade; quando estiverem vazios, gere título/descrição a partir da conversa.",
      "- Se houver conflito, preserve esta ordem: sistema > contexto/memória > personalização do agente > regras gerais > roteiro > actions.",
      "- Actions são capacidades do sistema: acione-as apenas pelo contexto correto, com campos suficientes, e nunca invente que uma integração foi executada se o runtime não confirmou."
    ].join("\n")
  );
  const websites = Array.isArray(brainValue.websites) ? brainValue.websites.filter(Boolean) : [];
  if (websites.length) {
    parts.push(`Referências (sites):\n${websites.map((u: string) => `- ${u}`).join("\n")}`);
  }
  const manualContext = String(brainValue.manualContext || "").trim();
  if (manualContext) {
    parts.push(`Contexto manual do cérebro:\n${manualContext.slice(0, 8000)}`);
  }
  const qna = Array.isArray(brainValue.qna) ? brainValue.qna : [];
  if (qna.length && brainValue.includeQnaInPrompt !== false) {
    const lines = qna.slice(0, 45).map((qa: any, i: number) => {
      const q = String(qa?.pergunta || "").trim();
      const a = String(qa?.resposta || "").trim().slice(0, 1400);
      const cat = String(qa?.categoria || "").trim();
      return `${i + 1}. ${cat ? `[${cat}] ` : ""}P: ${q}\n   R: ${a}`;
    });
    parts.push(`Base de conhecimento (Q&A):\n${lines.join("\n\n")}`);
  }
  const fid = brainValue.fileListId;
  if (fid && brainValue.listUploadedFileNamesInPrompt !== false) {
    try {
      const fl = await ShowFileService(Number(fid), companyId);
      const names = (fl.options || []).map((o: any) => String(o.name || "").trim()).filter(Boolean);
      if (names.length) {
        parts.push(
          `Arquivos na base do agente (apenas nomes; não invente o conteúdo):\n${names.map((n) => `- ${n}`).join("\n")}`
        );
      }
    } catch {
      logger.warn(`[AI SERVICE] Não foi possível listar arquivos do cérebro (fileListId=${fid})`);
    }
  }
  return `\n\n--- Cérebro cognitivo e conhecimento ---\n${parts.join("\n\n")}\n--- Fim cérebro ---`;
}

export async function getAgentPromptExtensionsForChat(companyId: number): Promise<{
  brainBlock: string;
  proactiveBlock: string;
  actionsBlock: string;
}> {
  let brainValue: Record<string, any> | null = null;
  try {
    const brain = await ListSettingsServiceOne({ companyId, key: "agent_brain" });
    brainValue = brain?.value ? JSON.parse(brain.value as any) : null;
  } catch {
    brainValue = null;
  }
  const proactive = await loadAgentProactiveSettingsParsed(companyId);
  const proactiveBlock = await buildReactiveProactivePromptBlock(proactive);
  const actions = await loadAgentActionsSetting(companyId);
  const actionsBlock = await buildAgentActionsPromptBlock(companyId, actions);
  const brainBlock = await buildBrainKnowledgePromptBlock(companyId, brainValue);
  return { brainBlock, proactiveBlock, actionsBlock };
}

function normalizeJsonObject(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Ações (ex.: Transferir chamado) salvas em produtividade.actions do Prompt — isolado por agente. */
export function getAgentActionsFromPromptProdutividade(prompt: {
  id?: number;
  produtividade?: unknown;
}): Record<string, any> {
  const prod =
    prompt.id != null
      ? resolveOwnedPromptBlobsForRuntime(prompt.id, {}, {}, prompt.produtividade).produtividade
      : normalizeJsonObject(prompt.produtividade);
  const raw = prod.actions;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, any>;
}

export const buildWhatsappPromptScopePreamble = buildWhatsappPromptScopePreambleFn;

function promptHasBrainContent(cerebro: Record<string, any>): boolean {
  if (!cerebro || cerebro.includeKnowledgeInPrompt === false) return false;
  const websites = Array.isArray(cerebro.websites) ? cerebro.websites.filter(Boolean) : [];
  const qna = Array.isArray(cerebro.qna) ? cerebro.qna : [];
  const fid = cerebro.fileListId;
  const manualContext = String(cerebro.manualContext || "").trim();
  return websites.length > 0 || qna.length > 0 || manualContext.length > 0 || (fid != null && fid !== "");
}

/**
 * Extensões de prompt para agente vinculado à conexão WhatsApp (Prompt): usa cargo/cérebro/ações
 * do próprio registro. Não mistura agent_brain / agent_actions globais quando o agente tem base própria.
 */
export async function getExtensionsForWhatsappAgentPrompt(
  companyId: number,
  prompt: { id?: number; cargo?: unknown; cerebro?: unknown; produtividade?: unknown }
): Promise<{ brainBlock: string; proactiveBlock: string; actionsBlock: string }> {
  const owned =
    prompt.id != null
      ? resolveOwnedPromptBlobsForRuntime(
          prompt.id,
          prompt.cargo,
          prompt.cerebro,
          prompt.produtividade
        )
      : {
          cargo: normalizeJsonObject(prompt.cargo),
          cerebro: normalizeJsonObject(prompt.cerebro),
          produtividade: normalizeJsonObject(prompt.produtividade)
        };
  const cerebro = owned.cerebro;
  const prod = owned.produtividade;
  const brainBlock = promptHasBrainContent(cerebro)
    ? await buildBrainKnowledgePromptBlock(companyId, cerebro)
    : "";

  const actionsFromPrompt = prod.actions && typeof prod.actions === "object" ? prod.actions : null;
  const enabled = Array.isArray(actionsFromPrompt?.enabled) ? actionsFromPrompt.enabled : [];
  const actionsBlock =
    enabled.length > 0
      ? await buildAgentActionsPromptBlock(companyId, actionsFromPrompt as Record<string, any>)
      : "";

  let proactiveBlock = "";
  const proRaw = prod.proactive;
  if (proRaw && typeof proRaw === "object" && Object.keys(proRaw as object).length) {
    const proactiveParsed = parseAgentProactiveSettings(proRaw);
    proactiveBlock = await buildReactiveProactivePromptBlock(proactiveParsed);
  }

  return { brainBlock, proactiveBlock, actionsBlock };
}

/** Quando o atendimento usa um Prompt vinculado à conexão, não misturar com agent_role global. */
const ISOLATED_PROMPT_ROLE_FALLBACK = `Papel do agente: siga exclusivamente as instruções e a base de conhecimento deste agente (abaixo). Não use tom, objetivos ou informações de outros agentes ou setores da empresa.\n`;

export type BuildAgentRoleOptions = {
  /**
   * true = apenas cargo do Prompt; se vazio, usa aviso de isolamento (não lê Settings agent_role).
   * false/omitido = mantém compat: cargo preenchido OU fallback no agent_role global (integração sem prompt).
   */
  preferPromptOnly?: boolean;
};

/**
 * Monta bloco de papel/personalidade: prioriza JSON cargo do Prompt; senão cai no agent_role global
 * (exceto quando preferPromptOnly — uso: WhatsApp com Prompt vinculado).
 */
export async function buildAgentRoleInstructionLines(
  companyId: number,
  promptCargo: unknown,
  options?: BuildAgentRoleOptions
): Promise<string> {
  const cargo = normalizeJsonObject(promptCargo);
  const lines: string[] = [];
  const add = (key: string, prefix: string) => {
    const v = cargo[key];
    if (v == null || !String(v).trim()) return;
    lines.push(`${prefix}${String(v).trim()}`);
  };
  add("funcao", "Função: ");
  add("personalidade", "Personalidade: ");
  add("instrucoes", "Regras gerais (obrigatório — alinhadas à seção Regras no documento do agente): ");
  add("formalidade", "Tom: ");
  const idioma = cargo.idioma != null ? String(cargo.idioma).trim() : "";
  if (idioma) lines.push(`Responda em ${idioma}.`);
  add("saudacao", "Saudação padrão: ");
  add("despedida", "Despedida padrão: ");
  add("emojis", "Uso de emojis: ");
  add("empresaContexto", "Contexto da empresa: ");
  add("objetivoAgente", "Objetivo do agente: ");
  add("regrasRestricoes", "Regras e restrições: ");
  add("nichoEmpresa", "Nicho: ");

  if (lines.length) {
    return `${lines.join("\n")}\n`;
  }

  if (options?.preferPromptOnly) {
    return ISOLATED_PROMPT_ROLE_FALLBACK;
  }

  let roleValue: any = null;
  try {
    const role = await ListSettingsServiceOne({ companyId, key: "agent_role" });
    roleValue = role?.value ? JSON.parse(role.value as any) : null;
  } catch {
    roleValue = null;
  }
  const roleFunc = roleValue?.funcao ? `Função: ${roleValue.funcao}` : "";
  const rolePers = roleValue?.personalidade ? `Personalidade: ${roleValue.personalidade}` : "";
  const roleInstr = roleValue?.instrucoes ? `Instruções: ${roleValue.instrucoes}` : "";
  const roleForm = roleValue?.formalidade ? `Tom: ${roleValue.formalidade}` : "";
  const roleLang = roleValue?.idioma ? `Responda em ${roleValue.idioma}.` : "";
  const roleGreet = roleValue?.saudacao ? `Saudação padrão: ${roleValue.saudacao}` : "";
  const roleBye = roleValue?.despedida ? `Despedida padrão: ${roleValue.despedida}` : "";
  const roleEmoji = roleValue?.emojis ? `Uso de emojis: ${roleValue.emojis}` : "";
  const fallback = [
    roleLang,
    roleForm,
    roleFunc,
    rolePers,
    roleEmoji,
    roleGreet,
    roleBye,
    roleInstr
  ]
    .filter(Boolean)
    .join("\n");
  return fallback ? `${fallback}\n` : "";
}

/**
 * Destino da transferência quando a ação está ativa: fila configurada, ou só usuário (fila resolvida na execução),
 * ou fallback na fila do prompt de integração. Exige pelo menos fila ou usuário na configuração da ação.
 */
function resolveAgentTransferTarget(
  aiSettings: IOpenAi,
  agentActions: Record<string, any>,
  ticketQueueFallback?: number | null
): { queueId: number | null; userId?: number } {
  const enabled = Array.isArray(agentActions?.enabled) ? agentActions.enabled : [];
  const transferActionOn = enabled.includes("Transferir Chamado");
  const tc = agentActions?.transferChamado;
  const cfgQueue = tc != null ? Number(tc.queueId) : NaN;
  const cfgUser = tc != null ? Number(tc.userId) : NaN;
  const hasQueue = Number.isFinite(cfgQueue) && cfgQueue > 0;
  const hasUser = Number.isFinite(cfgUser) && cfgUser > 0;

  if (transferActionOn && hasQueue) {
    return {
      queueId: cfgQueue,
      ...(hasUser ? { userId: cfgUser } : {})
    };
  }

  if (transferActionOn && hasUser) {
    return { queueId: null, userId: cfgUser };
  }

  const promptQ = aiSettings.queueId != null ? Number(aiSettings.queueId) : NaN;
  if (Number.isFinite(promptQ) && promptQ > 0) {
    return { queueId: promptQ };
  }

  const tq = ticketQueueFallback != null ? Number(ticketQueueFallback) : NaN;
  if (Number.isFinite(tq) && tq > 0) {
    return { queueId: tq };
  }
  return { queueId: null };
}

async function loadProactiveMediaFlags(
  companyId: number
): Promise<{ vision: boolean; ack: boolean }> {
  try {
    const row = await ListSettingsServiceOne({ companyId, key: "agent_proactive" });
    const v = row?.value
      ? typeof row.value === "string"
        ? JSON.parse(row.value as string)
        : row.value
      : {};
    return {
      vision: v.openAiVisionInbound === true,
      ack: v.acknowledgeMedia !== false
    };
  } catch {
    return { vision: false, ack: true };
  }
}

async function loadAgentProactiveSettingsParsed(
  companyId: number
): Promise<AgentProactiveSettings> {
  try {
    const row = await ListSettingsServiceOne({ companyId, key: "agent_proactive" });
    if (!row?.value) return {};
    const raw =
      typeof row.value === "string" ? JSON.parse(row.value as string) : row.value;
    return parseAgentProactiveSettings(raw);
  } catch {
    return {};
  }
}

const MISSION_LABELS: Record<ProactiveMissionMode, string> = {
  balanced: "Equilibrado (útil, próximo passo quando couber)",
  sales: "Vendas (perguntas curtas, avançar para demo/proposta/fechamento)",
  support: "Suporte (diagnóstico, evitar empurrar venda)",
  nurture: "Nutrição de lead (educar antes de vender)",
  appointment_focus: "Foco em agenda (marcar reunião/demo)",
  retention: "Retenção (valor contínuo, risco de churn, win-back)",
  billing: "Cobrança / financeiro (clareza, prazos, sem tom agressivo)",
  onboarding: "Onboarding (primeiros passos, checklists, próximo marco)",
  technical_depth: "Técnico aprofundado (especificação, requisitos, limitações)"
};

const PLAYBOOK_LABELS: Record<string, string> = {
  "": "",
  consultivo: "Consultivo",
  prospeccao: "Prospecção",
  suporte_upsell: "Suporte + upsell",
  sdr_light: "SDR enxuto",
  closer: "Fechamento",
  customer_success: "Sucesso do cliente"
};

async function buildReactiveProactivePromptBlock(
  settings: AgentProactiveSettings
): Promise<string> {
  const parts: string[] = [];
  const brief = settings.inboundConversationBrief?.trim();
  if (brief) {
    parts.push(
      `Roteiro comercial na conversa (siga quando fizer sentido; adapte ao que o cliente já disse):\n${brief}`
    );
  }
  const mission = (settings.proactiveMission || "balanced") as ProactiveMissionMode;
  const missionLine =
    (MISSION_LABELS as Record<string, string>)[mission] || MISSION_LABELS.balanced;
  parts.push(`Tom/missão alinhada às automações: ${missionLine}`);
  if (mission === "balanced") {
    parts.push(
      "Com conversas comerciais leves, qualifique antes de propor demo com data/hora: uma pergunta sobre contexto ou necessidade costuma evitar agendamento prematuro."
    );
  }
  const pb = settings.playbook != null ? String(settings.playbook) : "";
  if (pb && PLAYBOOK_LABELS[pb]) {
    parts.push(`Estilo de playbook: ${PLAYBOOK_LABELS[pb]}`);
  }
  const objIn = settings.objectives?.inbound?.trim();
  if (objIn) {
    parts.push(`Objetivo específico no chat: ${objIn}`);
  }

  if (mission === "sales") {
    parts.push(
      "Prioridade no chat: conduzir vendas com qualificação. Antes de propor demonstração ao vivo com data/hora, faça 1–2 perguntas curtas de contexto (segmento, necessidade principal, tamanho da operação ou objetivo). Se o cliente só disser que quer 'ver como funciona', explique em 1–2 frases e qualifique; não pule direto para 'qual dia e horário'. Ofereça vídeo/material se existir nos anexos configurados quando ele pedir ou quando ajudar na qualificação."
    );
  }
  if (mission === "appointment_focus") {
    parts.push(
      "Prioridade: marcar reunião/demo com data e horário quando houver fit claro; ainda assim faça uma pergunta de qualificação mínima se o contexto for vago. Evite agendar na primeira mensagem após um interesse genérico."
    );
  }
  if (mission === "retention") {
    parts.push(
      "Prioridade: retenção — reforce valor já entregue, entenda motivação e ofereça caminhos antes de perder o cliente; evite discurso genérico."
    );
  }
  if (mission === "billing") {
    parts.push(
      "Prioridade: cobrança/financeiro — seja claro em valores e prazos, confirme entendimento e ofereça canal adequado para regularização."
    );
  }
  if (mission === "onboarding") {
    parts.push(
      "Prioridade: onboarding — uma etapa por vez, confirme o que já foi feito e indique o próximo passo concreto (sem listas enormes)."
    );
  }
  if (mission === "technical_depth") {
    parts.push(
      "Prioridade: profundidade técnica — confirme requisitos, versões e limitações; não prometa o que não estiver nas referências ou no roteiro."
    );
  }
  if (pb === "consultivo" && mission === "sales") {
    parts.push(
      "Combine estilos: ouça com tom consultivo, mas mantenha avanço comercial (objetivo e roteiro) — não fique só em perguntas abertas sem próximo passo claro."
    );
  }

  const links = (settings.contextualLinks || []).filter(
    (l): l is ContextualLink =>
      !!l && typeof l.url === "string" && /^https?:\/\//i.test(l.url.trim())
  );
  if (links.length) {
    const globalFetch = !!settings.fetchLinkContentForPrompt;
    const linkLines: string[] = [];
    for (let i = 0; i < links.length; i++) {
      const L = links[i];
      const u = L.url.trim();
      const label = (L.label || `Link ${i + 1}`).trim();
      const when = (L.whenToUse || "").trim();
      let line = `${i + 1}) ${label}: ${u}${when ? ` — usar quando: ${when}` : ""}`;
      const doFetch = globalFetch || !!L.fetchContent;
      if (doFetch) {
        const snippet = await fetchPageTextSnippet(u);
        if (snippet) {
          line += `\n   (Trecho público da página, use só como referência; não invente dados além disto:)\n   ${snippet.slice(0, 1200)}${snippet.length > 1200 ? "…" : ""}`;
        }
      }
      linkLines.push(line);
    }
    parts.push(
      `Links configurados pelo operador — cite só quando fizer sentido; não invente preços ou condições que não apareçam abaixo:\n${linkLines.join("\n\n")}`
    );
  }

  const packIn = settings.mediaByContext?.inbound;
  const nInboundMedia =
    (packIn?.imageUrls?.filter(Boolean).length || 0) +
    (packIn?.documentUrls?.filter(Boolean).length || 0) +
    (packIn?.videoUrls?.filter(Boolean).length || 0);
  if (nInboundMedia > 0) {
    const mediaHint = buildBeforeMediaHintForPrompt(packIn);
    if (mediaHint) {
      parts.push(
        `Anexos configurados (catálogo, PDF, imagens, vídeos): se o cliente perguntar por vídeo, demo gravada, material ou arquivo, responda de forma natural (ex.: que vai enviar) e inclua [[SEND_INBOUND_MEDIA]] no final para o sistema disparar os anexos — a marcação não aparece para o cliente. Fora desses pedidos, só use a marcação quando fizer sentido. Não use em toda mensagem.\n${mediaHint}`
      );
    } else {
      parts.push(
        "Anexos: imagens, PDF ou vídeo — em pedidos explícitos (ex.: 'tem vídeo?', 'manda material') inclua [[SEND_INBOUND_MEDIA]] no final da sua resposta para o sistema enviar; a marcação não aparece ao cliente. Caso contrário use só quando fizer sentido."
      );
    }
  }

  if (!parts.length) return "";
  return `\n\n--- Configuração comercial (Proatividade / chat) ---\n${parts.join(
    "\n\n"
  )}\n--- Fim ---`;
}

/** Remove marcas internas de disparo de mídia (não exibidas ao cliente). */
function stripInboundMediaMarkers(text: string): string {
  return String(text || "")
    .replace(/\[\[SEND_INBOUND_MEDIA\]\]/gi, "")
    .replace(/\[\[ENVIAR_ANEXO\]\]/gi, "")
    .replace(/\[\[ENVIAR_ANEXOS\]\]/gi, "")
    .replace(/\s{3,}/g, " ")
    .trim();
}

function hasInboundMediaMarker(text: string): boolean {
  return /\[\[SEND_INBOUND_MEDIA\]\]|\[\[ENVIAR_ANEXO\]\]|\[\[ENVIAR_ANEXOS\]\]/i.test(
    String(text || "")
  );
}

/** Cliente pediu material / arquivo / vídeo / preço encaminhável, ou a IA declara envio. */
function detectMaterialOrAttachmentIntent(text: string): boolean {
  const raw = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!raw.trim()) return false;
  const keywords = [
    "catalogo",
    "material",
    "materiais",
    "pdf",
    "arquivo",
    "anexo",
    "envia",
    "envie",
    "manda",
    "mande",
    "me manda",
    "me envia",
    "me envie",
    "folheto",
    "folder",
    "flyer",
    "deck",
    "apresentacao",
    "slides",
    "tabela",
    "planilha",
    "orcamento",
    "proposta",
    "amostra",
    "quero ver",
    "pode mandar",
    "preciso de",
    "gostaria de receber",
    "tem como enviar",
    "segue o",
    "seguem os",
    "link do",
    "manda o",
    "video",
    "videos",
    "clip",
    "tutorial",
    "gravacao",
    "mostra",
    "mostrar",
    "assistir",
    "demo gravada",
    "tem como ver",
    "pode ver",
    "envia o video",
    "manda o video",
    "material em video",
    "demo",
    "demonstracao",
    "ver a demo",
    "ver demo",
    "agendar demo"
  ];
  if (keywords.some(k => raw.includes(k))) return true;
  if (
    /\b(tem|tem um|ha|existe|voces?\s+tem|vc\s+tem)\b\s*(um\s+)?(video|clip|tutorial|material|pdf)\b/.test(raw)
  ) {
    return true;
  }
  if (
    /\b(envio|enviando|mandando|seguem?|segue)\b.*\b(anexo|arquivo|material|pdf|catalogo|imagens?|fotos?|video|link)\b/.test(
      raw
    )
  ) {
    return true;
  }
  return false;
}

function shouldSendInboundContextMedia(
  settings: AgentProactiveSettings,
  userInboundText: string,
  assistantText: string,
  hadExplicitMarker: boolean
): boolean {
  if (settings.inboundMediaAlwaysAfterReply === true) return true;
  if (hadExplicitMarker) return true;
  if (detectMaterialOrAttachmentIntent(userInboundText)) return true;
  if (detectMaterialOrAttachmentIntent(assistantText)) return true;
  return false;
}

async function maybeSendInboundReplyMedia(params: {
  ticket: Ticket;
  contact: Contact;
  priorOutboundCount: number;
  outcome: "sent" | "skipped";
  userInboundText?: string;
  assistantRawText?: string;
  hadExplicitMediaMarker?: boolean;
}): Promise<void> {
  const {
    ticket,
    contact,
    priorOutboundCount,
    outcome,
    userInboundText = "",
    assistantRawText = "",
    hadExplicitMediaMarker = false
  } = params;
  if (outcome !== "sent") return;
  try {
    const settings = await loadAgentProactiveSettingsParsed(ticket.companyId);
    const pack = settings.mediaByContext?.inbound;
    const n =
      (pack?.imageUrls?.filter(Boolean).length || 0) +
      (pack?.documentUrls?.filter(Boolean).length || 0) +
      (pack?.videoUrls?.filter(Boolean).length || 0);
    if (!pack || n === 0) return;
    const explicitMaterialAsk = detectMaterialOrAttachmentIntent(userInboundText);
    if (
      settings.inboundMediaOnlyFirstResponse &&
      priorOutboundCount > 0 &&
      !explicitMaterialAsk
    ) {
      logger.info(
        `[AI SERVICE] inbound mídia ignorada (só primeira resposta) ticket=${ticket.id}`
      );
      return;
    }
    const assistantForGate = stripInboundMediaMarkers(assistantRawText);
    if (
      !shouldSendInboundContextMedia(
        settings,
        userInboundText,
        assistantForGate,
        hadExplicitMediaMarker ||
          hasInboundMediaMarker(assistantRawText)
      )
    ) {
      logger.info(
        `[AI SERVICE] inbound mídia não enviada (sem intenção/marcação) ticket=${ticket.id}`
      );
      return;
    }
    await sendProactiveContextMediaAfterText(
      contact.id,
      "inbound",
      settings,
      ticket.id
    );
  } catch (e) {
    logger.warn(`[AI SERVICE] Falha ao enviar mídia inbound ticket=${ticket.id}:`, e);
  }
}

function pickVisionModel(model: string): string {
  const m = (model || "").toLowerCase();
  if (!m) return OPENAI_DEFAULT_CHAT_MODEL;
  if (m.includes("gpt-5")) return model;
  if (m.includes("gpt-4o") || m.includes("gpt-4.1")) return model;
  return OPENAI_DEFAULT_CHAT_MODEL;
}

// Função para detectar solicitação de transferência para atendente
const detectTransferRequest = (message: string): boolean => {
  const transferKeywords = [
    'falar com atendente',
    'quero um atendente',
    'atendente humano',
    'pessoa real',
    'sair do bot',
    'parar bot',
    'atendimento humano',
    'falar com alguém',
    'não estou conseguindo',
    'isso não funciona',
    'não entendi',
    'preciso de ajuda real',
    'quero falar com uma pessoa',
    'me transfere',
    'atendente por favor'
  ];

  const lowerMessage = message.toLowerCase();
  return transferKeywords.some(keyword => lowerMessage.includes(keyword));
};

// Função para detectar solicitação de continuação do fluxo
const detectFlowContinuation = (message: string, continueKeywords: string[]): boolean => {
  if (!continueKeywords || continueKeywords.length === 0) {
    return false;
  }

  const lowerMessage = message.toLowerCase().trim();
  return continueKeywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
};

// Função para detectar se o objetivo foi completado (usando IA)
const checkObjectiveCompletion = async (
  objective: string,
  conversation: Message[],
  openai: OpenAI,
  ticket: Ticket
): Promise<boolean> => {
  if (!objective || !openai) return false;

  try {
    // Preparar histórico da conversa para análise
    const conversationText = conversation
      .slice(-5) // Últimas 5 mensagens
      .map(msg => `${msg.fromMe ? 'Bot' : 'User'}: ${msg.body}`)
      .join('\n');

    const analysisPrompt = `
Objetivo: ${objective}

Conversa:
${conversationText}

Pergunta: O objetivo foi completado com sucesso? Responda apenas "SIM" ou "NÃO".
`;

    logAiCallDebug("OpenAiService.ts:checkObjectiveCompletion", ticket, analysisPrompt);

    const response = await openai.chat.completions.create({
      model: OPENAI_DEFAULT_FAST_MODEL,
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 10,
      temperature: 0
    });

    const result = response.choices[0]?.message?.content?.trim().toUpperCase();
    return result === "SIM";

  } catch (error) {
    logger.error("[AI SERVICE] Erro ao verificar completude do objetivo:", error);
    return false;
  }
};

// Função para retornar ao fluxo
const returnToFlow = async (ticket: Ticket, reason: string): Promise<void> => {
  try {
    const flowContinuation = (ticket.dataWebhook && typeof ticket.dataWebhook === "object" && "flowContinuation" in ticket.dataWebhook)
      ? (ticket.dataWebhook as any).flowContinuation
      : undefined;

    if (!flowContinuation || !flowContinuation.nextNodeId) {
      logger.warn(`[FLOW CONTINUATION] Informações de continuação não encontradas - ticket ${ticket.id}`);
      await ticket.update({
        useIntegration: false,
        isBot: false,
        dataWebhook: null
      });
      return;
    }

    logger.info(`[FLOW CONTINUATION] Retornando ao fluxo - ticket ${ticket.id}, razão: ${reason}`);

    // Enviar mensagem de transição
    const transitionMessages = {
      user_requested: "Perfeito! Vou prosseguir com o atendimento.",
      max_interactions: "Obrigado pelas informações! Vou continuar com o próximo passo.",
      timeout: "Vou prosseguir com o atendimento.",
      objective_completed: "Ótimo! Completamos essa etapa. Vamos continuar!"
    };

    const transitionMessage = transitionMessages[reason] || "Continuando...";

    // Enviar mensagem de transição
    const wbot = await getWbot(ticket.whatsappId);
    const sentMessage = await wbot.sendMessage(getJidOf(ticket.contact), {
      text: transitionMessage
    });
    await verifyMessage(sentMessage!, ticket, ticket.contact, undefined, true, false, true);

    // Restaurar estado do fluxo
    await ticket.update({
      useIntegration: false,
      isBot: false,
      dataWebhook: flowContinuation.originalDataWebhook
    });

    // Continuar fluxo no próximo nó
    if (flowContinuation.nextNodeId) {
      logger.info(`[FLOW CONTINUATION] Continuando fluxo no nó ${flowContinuation.nextNodeId} - ticket ${ticket.id}`);

      const { ActionsWebhookService } = await import("../WebhookService/ActionsWebhookService");

      const flow = await FlowBuilderModel.findOne({
        where: { id: ticket.flowStopped }
      });

      if (flow) {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        await ActionsWebhookService(
          ticket.whatsappId,
          parseInt(ticket.flowStopped),
          ticket.companyId,
          nodes,
          connections,
          flowContinuation.nextNodeId,
          flowContinuation.originalDataWebhook,
          "",
          ticket.hashFlowId || "",
          null,
          ticket.id,
          {
            number: ticket.contact.number,
            name: ticket.contact.name,
            email: ticket.contact.email || ""
          }
        );
      }
    }

  } catch (error) {
    logger.error(`[FLOW CONTINUATION] Erro ao retornar ao fluxo:`, error);

    await ticket.update({
      useIntegration: false,
      isBot: false,
      dataWebhook: null
    });
  }
};

// Prepara as mensagens de IA a partir das mensagens passadas
const prepareMessagesAI = (pastMessages: Message[], isGeminiModel: boolean, promptSystem: string): any[] => {
  const messagesAI: any[] = [];

  // Para OpenAI, incluir o prompt do sistema como 'system' role
  // Para Gemini, passamos o prompt do sistema separadamente
  if (!isGeminiModel) {
    messagesAI.push({ role: "system", content: promptSystem });
  }

  for (const message of pastMessages) {
    const content = (message.body || "").trim();
    if (!content) continue;
    if (message.fromMe) {
      messagesAI.push({ role: "assistant", content });
    } else {
      messagesAI.push({ role: "user", content });
    }
  }

  return messagesAI;
};

// Processa a resposta da IA (texto ou áudio)
const processResponse = async (
  responseText: string,
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  aiSettings: IOpenAi,
  ticketTraking?: TicketTraking
): Promise<"sent" | "skipped"> => {
  let response = responseText;

  const raw = typeof response === "string" ? response.trim() : "";
  const onlyPunctuation = raw.length > 0 && /^[\.\!\?\-\_\(\)\[\]\{\}"'`~…·•]+$/.test(raw);
  const hasAlphaNum = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(raw);
  const cleaned = raw.replace(/[^\p{L}\p{N}]+/gu, "").trim();
  // Evitar substituir respostas curtas válidas ("Sim", "Ok", "Segue o vídeo.") pelo fallback genérico.
  if (!raw || raw.length < 2 || onlyPunctuation || !hasAlphaNum || cleaned.length < 1) {
    response = "Desculpe, não consegui entender sua mensagem. Pode reformular?";
  }

  // Verificar se o usuário pediu para falar com atendente
  const userMessage = getBodyMessage(msg) || "";
  const userRequestedTransfer = detectTransferRequest(userMessage);
  const agentActions =
    aiSettings.agentActionsScoped !== undefined
      ? aiSettings.agentActionsScoped || {}
      : await loadAgentActionsSetting(ticket.companyId);
  const { queueId: transferQueueId, userId: transferUserId } = resolveAgentTransferTarget(
    aiSettings,
    agentActions,
    ticket.queueId
  );

  if (userRequestedTransfer) {
    logger.info(`[AI SERVICE] Usuário solicitou transferência para atendente - ticket ${ticket.id}`);

    // Desabilitar modo IA
    await ticket.update({
      useIntegration: false,
      isBot: false,
      dataWebhook: null,
      status: "pending"
    });

    const transferMessage = "Entendi que você gostaria de falar com um atendente humano. Estou transferindo você agora. Aguarde um momento!";

    const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
      text: `\u200e ${transferMessage}`,
    });
    await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);

    await applyResolvedAgentTransferToTicket(ticket, contact, transferQueueId, transferUserId);

    logger.info(`[AI SERVICE] Ticket ${ticket.id} transferido para atendimento humano`);
    return "skipped";
  }

  // Verificar ação de transferência da IA
  if (response?.toLowerCase().includes("ação: transferir para o setor de atendimento")) {
    logger.info(`[AI SERVICE] IA solicitou transferência para atendente - ticket ${ticket.id}`);

    await ticket.update({
      useIntegration: false,
      isBot: false,
      dataWebhook: null,
      status: "pending"
    });

    await applyResolvedAgentTransferToTicket(ticket, contact, transferQueueId, transferUserId);

    response = response.replace(/ação: transferir para o setor de atendimento/i, "").trim();

    logger.info(`[AI SERVICE] Ticket ${ticket.id} transferido por solicitação da IA`);
  }

  response = sanitizeAgentCustomerVisibleText(response || "");

  if (!response && !userRequestedTransfer) {
    return "skipped";
  }

  const publicFolder: string = path.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);

  // Enviar resposta baseada no formato preferido (texto ou voz)
  // IMPORTANTE: Gemini sempre responde em texto, OpenAI pode usar voz
  const useVoice = aiSettings.provider === "openai" && aiSettings.voice !== "texto";

  if (!useVoice) {
    try {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatches = (response.match(urlRegex) || []) as string[];
      const urls: string[] = Array.from(
        new Set<string>(urlMatches.map((u: string) => u.replace(/[)\]\.,;]+$/, "")))
      );
      if (urls.length) {
        const allowed = /\.(png|jpe?g|gif|webp|mp4|mov|avi|mkv|mp3|wav|ogg|webm|pdf|docx?|xlsx?|pptx?|zip|7z|rar)$/i;
        const basePublic = path.resolve(__dirname, "..", "..", "..", "public");
        const companyFolder = path.join(basePublic, `company${ticket.companyId}`, "ai-attachments");
        if (!fs.existsSync(companyFolder)) fs.mkdirSync(companyFolder, { recursive: true });
        for (const u of urls) {
          if (!allowed.test(String(u))) continue;
          try {
            const urlObj = new URL(String(u));
            const baseName = decodeURIComponent(urlObj.pathname.split("/").filter(Boolean).pop() || `file_${Date.now()}`);
            const safeName = baseName.replace(/[^\w\.\-]+/g, "_");
            const target = path.join(companyFolder, `${Date.now()}_${safeName}`);
            const res = await axios.get(String(u), { responseType: "arraybuffer", timeout: 15000 });
            fs.writeFileSync(target, Buffer.from(res.data));
            const opts = await getMessageOptions(safeName, target, String(ticket.companyId), "");
            if (opts && Object.keys(opts).length) {
              const mediaMsg = await wbot.sendMessage(resolveReplyJid(msg, contact), { ...opts });
              await verifyMediaMessage(mediaMsg!, ticket, contact, ticketTraking, false, false, wbot, true);
              await new Promise(r => setTimeout(r, 200));
            }
          } catch (e) {
            try { logger.warn(`[AI SERVICE] Falha ao baixar/enviar mídia: ${String(u)}`); } catch {}
          }
        }
      }
    } catch {}
    const blocks: string[] = [];
    const paragraphs = response.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    for (const p of paragraphs.length ? paragraphs : [response]) {
      if (p.length <= 600) {
        blocks.push(p);
      } else {
        let start = 0;
        while (start < p.length) {
          const end = Math.min(start + 600, p.length);
          blocks.push(p.slice(start, end).trim());
          start = end;
        }
      }
    }
    const finalBlocks = blocks.map((b) => sanitizeAgentCustomerVisibleText(String(b || ""))).filter(Boolean).slice(0, 4);
    if (!finalBlocks.length) return "skipped";
    for (const b of finalBlocks) {
      const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), { text: `\u200e ${b}` });
      await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
      await new Promise(r => setTimeout(r, 250));
    }
    await markTicketUnderAgentAttendance(ticket);
    return "sent";
  } else {
    // Apenas OpenAI pode usar voz
    const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
    try {
      await convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response),
        `${publicFolder}/${fileNameWithOutExtension}`,
        aiSettings.voiceKey,
        aiSettings.voiceRegion,
        aiSettings.voice,
        "mp3"
      );
      const sendMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
        mimetype: "audio/mpeg",
        ptt: true,
      });
      await verifyMediaMessage(sendMessage!, ticket, contact, ticketTraking, false, false, wbot, true);
      await markTicketUnderAgentAttendance(ticket);
      deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
      deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
      return "sent";
    } catch (error) {
      console.error(`Erro para responder com audio: ${error}`);
      // Fallback para texto
      if (!response) return "skipped";
      const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
        text: `\u200e ${response}`,
      });
      await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
      await markTicketUnderAgentAttendance(ticket);
      return "sent";
    }
  }
  return "skipped";
};

const hasMeetingIntent = (text: string): boolean => {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return (
    /\b(reuniao|reunioes|meeting|meet|call|demo|demos|videocall|videochamada|visio)\b/.test(t) ||
    /\b(ligacao|ligacoes|telefonema|bater um papo|conversa rapida)\b/.test(t) ||
    /\b(apresentacao|apresentacoes|pitch|demo ao vivo|sessao)\b/.test(t) ||
    /\b(agendar|agenda|agendamento|marcar|marque|remarcar|remarque|combinar um horario)\b/.test(t) ||
    /\b(quero\s+(marcar|agendar)|podemos\s+marcar|vamos\s+marcar)\b/.test(t)
  );
};

export const tryScheduleMeeting = async (
  bodyMessage: string,
  ticket: Ticket,
  contact: Contact,
  pastMessages: Message[] = []
): Promise<{ handled: boolean; when?: Date }> => {
  const currentIntent = hasMeetingIntent(bodyMessage);
  const recentIntent = (pastMessages || [])
    .slice(-12)
    .some((m) => hasMeetingIntent(String(m.body || "")));
  // Fluxo comum: IA pergunta "qual dia/horário?" e cliente responde só com data/hora.
  // Nesse caso aceitamos o contexto recente de intenção de reunião.
  if (!currentIntent && !recentIntent) {
    return { handled: false };
  }

  const parsed = parseDateTimeFromText(bodyMessage);
  if (!parsed.matched || !parsed.date) return { handled: false };
  const when = parsed.date;
  const body = buildScheduleMessageBody({
    ticket,
    contact,
    bodyMessage,
    pastMessages
  });
  const schedule = await CreateScheduleService({
    body,
    sendAt: when.toISOString(),
    contactId: contact.id,
    companyId: ticket.companyId,
    userId: ticket.userId || undefined,
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
  return { handled: true, when };
};

/**
 * Usado pelo fluxo de atendimento (prompt): cria agendamento no calendário quando a última
 * mensagem do cliente contém data/hora interpretável (mesma lógica de parse do agendamento por IA).
 */
export async function createScheduleFromFlowCustomerReply(
  bodyMessage: string,
  ticket: Ticket,
  contact: Contact
): Promise<{ created: boolean; when?: Date }> {
  const parsed = parseDateTimeFromText(bodyMessage);
  if (!parsed.matched || !parsed.date) {
    return { created: false };
  }
  const when = parsed.date;
  const pastMessages = await Message.findAll({
    where: { ticketId: ticket.id },
    order: [["createdAt", "ASC"]],
    limit: 80
  });
  const body = buildScheduleMessageBody({
    ticket,
    contact,
    bodyMessage,
    pastMessages
  });
  try {
    const schedule = await CreateScheduleService({
      body,
      sendAt: when.toISOString(),
      contactId: contact.id,
      companyId: ticket.companyId,
      userId: ticket.userId || undefined,
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
    return { created: true, when };
  } catch (e) {
    logger.error("[ATTENDANCE-FLOW] createScheduleFromFlowCustomerReply:", e);
    return { created: false };
  }
}

// Manipula requisição OpenAI
const MODEL_FALLBACK_CHAIN = ["gpt-5.5", "gpt-4.1", "gpt-4o", "gpt-4o-mini"];

const handleOpenAIRequest = async (
  openai: OpenAI,
  messagesAI: any[],
  aiSettings: IOpenAi,
  ticket?: Ticket | null
): Promise<string> => {
  const sysMsg = (messagesAI as any[])?.find((m: any) => m?.role === "system");
  const systemPromptUsed = sysMsg?.content ?? "(no role=system in messagesAI)";
  logAiCallDebug("OpenAiService.ts:handleOpenAIRequest", ticket ?? null, systemPromptUsed);

  const payload: any = {
    model: aiSettings.model,
    messages: messagesAI as any,
    max_tokens: aiSettings.maxTokens,
    temperature: aiSettings.temperature,
  };
  payload.top_p = (typeof aiSettings.topP === "number") ? aiSettings.topP : 1;
  payload.presence_penalty = (typeof aiSettings.presencePenalty === "number") ? aiSettings.presencePenalty : 0;
  payload.frequency_penalty = (typeof aiSettings.frequencyPenalty === "number") ? aiSettings.frequencyPenalty : 0;
  if (Array.isArray(aiSettings.stop)) {
    payload.stop = aiSettings.stop;
  } else if (typeof aiSettings.stop === "string" && aiSettings.stop.trim()) {
    payload.stop = aiSettings.stop.split(",").map(s => s.trim()).filter(Boolean);
  } else {
    payload.stop = ["###", "FIM"];
  }

  try {
    const chat = await openai.chat.completions.create(payload);
    return chat.choices[0].message?.content || "";
  } catch (error: any) {
    const errMsg = String(error?.message || "").toLowerCase();
    const isModelError = errMsg.includes("model") || errMsg.includes("not found") ||
      errMsg.includes("does not exist") || error?.status === 404 || error?.code === "model_not_found";

    if (isModelError) {
      for (const fallback of MODEL_FALLBACK_CHAIN) {
        if (fallback === aiSettings.model) continue;
        try {
          logger.info(`[AI SERVICE] Model "${aiSettings.model}" unavailable, trying "${fallback}"`);
          const fbPayload = { ...payload, model: fallback };
          const chat = await openai.chat.completions.create(fbPayload);
          return chat.choices[0].message?.content || "";
        } catch { /* try next */ }
      }
    }
    logger.error(`[AI SERVICE] OpenAI request error: ${error?.message || error}`);
    throw error;
  }
};

// Manipula requisição Gemini
const handleGeminiRequest = async (
  gemini: GoogleGenerativeAI,
  messagesAI: any[],
  aiSettings: IOpenAi,
  newMessage: string,
  promptSystem: string,
  ticket?: Ticket | null
): Promise<string> => {
  try {
    logAiCallDebug("OpenAiService.ts:handleGeminiRequest", ticket ?? null, promptSystem);

    const model = gemini.getGenerativeModel({
      model: aiSettings.model,
      systemInstruction: promptSystem,
    });

    // Converte o histórico para o formato do Gemini
    const geminiHistory: Content[] = messagesAI.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(newMessage);
    return result.response.text();
  } catch (error) {
    console.error("Gemini request error:", error);
    throw error;
  }
};

// Função principal para manipular interações de IA
export const handleOpenAiFlow = async (
  aiSettings: IOpenAi,
  msg: proto.IWebMessageInfo,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  mediaSent?: Message | undefined,
  ticketTraking?: TicketTraking
): Promise<void> => {
  try {
    if (!aiSettings) {
      logger.error("[AI SERVICE] Configurações da IA não fornecidas");
      return;
    }

    if (contact.disableBot) {
      logger.info("[AI SERVICE] Bot desabilitado para este contato");
      return;
    }

    logAiCallDebug(
      "OpenAiService.ts:handleOpenAiFlow:entry",
      ticket,
      aiSettings.systemPromptOverride || aiSettings.prompt || "(handleOpenAiFlow: no prompt in aiSettings)"
    );

    /**
     * Texto do system prompt e parâmetros do modelo vêm só de `aiSettings` (objeto explícito).
     * Não mesclar instruções a partir de ticket.dataWebhook.settings — isso evita vazar agente
     * de fila/fluxo antigo. O dataWebhook do ticket é usado apenas para metadados de fluxo
     * (ex.: flowContinuation), não para substituir o prompt.
     */

    // Verificar modo temporário e continuação de fluxo
    const isTemporaryMode = aiSettings.flowMode === "temporary";
    const dwNormalizedEarly = normalizeTicketDataWebhook(ticket.dataWebhook);
    const flowContinuation =
      "flowContinuation" in dwNormalizedEarly
        ? (dwNormalizedEarly as any).flowContinuation
        : undefined;

    // Verificações para voltar ao fluxo (apenas no modo temporário)
    if (isTemporaryMode && flowContinuation) {
      const bodyMessage = getBodyMessage(msg) || "";

      // 1. Verificar palavras-chave de continuação
      if (detectFlowContinuation(bodyMessage, aiSettings.continueKeywords || [])) {
        logger.info(`[AI SERVICE] Usuário solicitou continuação do fluxo - ticket ${ticket.id}`);
        return await returnToFlow(ticket, "user_requested");
      }

      // 2. Limite de interações: valores 0 ou 1 são tratados como "sem teto" — no Flow Builder
      // maxInteractions=1 era comum e bloqueava a 2ª mensagem do cliente (1ª responde, 2ª já estourava o limite).
      const maxInteractionsCap = Number(aiSettings.maxInteractions) || 0;
      const limitActive = maxInteractionsCap >= 2;
      const turnSoFar = Number(flowContinuation.interactionCount) || 0;
      if (limitActive && turnSoFar >= maxInteractionsCap) {
        logger.info(`[AI SERVICE] Limite de interações atingido - ticket ${ticket.id}`);
        return await returnToFlow(ticket, "max_interactions");
      }

      // 3. Verificar timeout
      if (aiSettings.completionTimeout) {
        const startTime = new Date(flowContinuation.startTime);
        const now = new Date();
        const minutesElapsed = (now.getTime() - startTime.getTime()) / (1000 * 60);

        if (minutesElapsed >= aiSettings.completionTimeout) {
          logger.info(`[AI SERVICE] Timeout atingido - ticket ${ticket.id}`);
          return await returnToFlow(ticket, "timeout");
        }
      }

      // Incrementar contador de interações (base normalizada: nunca espalhar null/string cru)
      const baseDw = normalizeTicketDataWebhook(ticket.dataWebhook);
      await ticket.update({
        dataWebhook: {
          ...baseDw,
          flowContinuation: {
            ...flowContinuation,
            interactionCount: turnSoFar + 1
          }
        }
      });
    }

    // Validação da estrutura da mensagem
    let bodyMessage = "";

    try {
      if (msg && msg.message) {
        bodyMessage = getBodyMessage(msg) || "";
      } else if (msg && msg.key) {
        const messageFromDB = await Message.findOne({
          where: { wid: msg.key.id, ticketId: ticket.id },
          order: [["createdAt", "DESC"]]
        });

        if (messageFromDB) {
          bodyMessage = messageFromDB.body || "";
          logger.info(`[AI SERVICE] Usando mensagem do banco: "${bodyMessage}"`);
        }
      }
    } catch (error) {
      logger.warn("[AI SERVICE] Erro ao extrair bodyMessage, tentando buscar última mensagem:", error);

      const lastMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: false
        },
        order: [['createdAt', 'DESC']]
      });

      if (lastMessage) {
        bodyMessage = lastMessage.body || "";
        logger.info(`[AI SERVICE] Usando última mensagem como fallback: "${bodyMessage}"`);
      }
    }

    const hasInboundMedia = !!(
      msg.message?.audioMessage ||
      msg.message?.imageMessage ||
      msg.message?.videoMessage ||
      msg.message?.documentMessage ||
      msg.message?.stickerMessage
    );

    if (!bodyMessage.trim() && !hasInboundMedia) {
      logger.warn("[AI SERVICE] Nenhum conteúdo de texto ou mídia encontrado");
      return;
    }

    if (!aiSettings.model) {
      logger.error("[AI SERVICE] Modelo não definido nas configurações");
      return;
    }

    if (msg.messageStubType) {
      logger.info("[AI SERVICE] Ignorando evento de grupo (messageStubType)");
      return;
    }

    const publicFolder: string = path.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);

    // Definir se é OpenAI ou Gemini baseado no provider
    const provider = aiSettings.provider || (aiSettings.model.startsWith('gpt-') ? 'openai' : 'gemini');
    const isOpenAIModel = provider === 'openai';
    const isGeminiModel = provider === 'gemini';

    if (!isOpenAIModel && !isGeminiModel) {
      logger.error(`[AI SERVICE] Provider não suportado: ${provider}`);
      await wbot.sendMessage(resolveReplyJid(msg, contact), {
        text: "Desculpe, o modelo de IA configurado não é suportado."
      });
      return;
    }

    let openai: OpenAI | null = null;
    let gemini: GoogleGenerativeAI | null = null;

    if (isOpenAIModel) {
      openai = new OpenAI({ apiKey: aiSettings.apiKey });
    } else if (isGeminiModel) {
      gemini = new GoogleGenerativeAI(aiSettings.apiKey);
    }

    const connPid = aiSettings.connectionPromptId;
    const useConnectionHistory =
      typeof connPid === "number" && !Number.isNaN(connPid) && connPid > 0;
    const historyWhere = useConnectionHistory
      ? buildWhereForConnectionAgentHistory(ticket, connPid)
      : { ticketId: ticket.id };

    const messages = await Message.findAll({
      where: historyWhere,
      order: [["createdAt", "ASC"]],
      limit: aiSettings.maxMessages > 0 ? aiSettings.maxMessages : undefined
    });

    // Formatar prompt do sistema
    const clientName = sanitizeName(contact.name || "Amigo(a)");
    const flowScoped = aiSettings.flowScoped === true;

    let promptSystem: string;
    const override =
      typeof aiSettings.systemPromptOverride === "string"
        ? aiSettings.systemPromptOverride.trim()
        : "";
    if (override) {
      promptSystem = override;
    } else if (flowScoped) {
      promptSystem = `Você está operando como nó de IA dentro de um fluxo de atendimento automatizado.

REGRAS OBRIGATÓRIAS:
- Siga ESTRITAMENTE apenas as instruções do bloco "Instruções do fluxo" abaixo. Não invente papel, tom ou conhecimento de "outros agentes" ou configurações globais.
- Use o nome ${clientName} quando fizer sentido.
- Limite aproximado de ${aiSettings.maxTokens} tokens por resposta.
- Quando o fluxo exigir encaminhamento humano, inicie a mensagem com: Ação: Transferir para o setor de atendimento
- Responda em blocos curtos (1 a 4), separados por uma linha em branco; cada bloco com até 3–4 frases.
- Se a solicitação for ambígua em relação ao que o fluxo pede, peça esclarecimentos objetivos alinhados ao objetivo do fluxo.
- Quando não for possível seguir o fluxo com segurança, responda de forma breve pedindo reformulação.

--- Instruções do fluxo (obrigatório) ---
${aiSettings.prompt || "(sem texto configurado no nó — peça ao administrador para preencher o prompt da IA no fluxo.)"}
--- Fim das instruções do fluxo ---`;
    } else {
      let roleValue = null as any;
      try {
        const role = await ListSettingsServiceOne({ companyId: ticket.companyId, key: "agent_role" });
        roleValue = role?.value ? JSON.parse(role.value as any) : null;
      } catch {}
      const roleFunc = roleValue?.funcao ? `Função: ${roleValue.funcao}` : "";
      const rolePers = roleValue?.personalidade ? `Personalidade: ${roleValue.personalidade}` : "";
      const roleInstr = roleValue?.instrucoes ? `Instruções: ${roleValue.instrucoes}` : "";
      const roleForm = roleValue?.formalidade ? `Tom: ${roleValue.formalidade}` : "";
      const roleLang = roleValue?.idioma ? `Responda em ${roleValue.idioma}.` : "";
      const roleGreet = roleValue?.saudacao ? `Saudação padrão: ${roleValue.saudacao}` : "";
      const roleBye = roleValue?.despedida ? `Despedida padrão: ${roleValue.despedida}` : "";
      const roleEmoji = roleValue?.emojis ? `Uso de emojis: ${roleValue.emojis}` : "";
      const promptExt = await getAgentPromptExtensionsForChat(ticket.companyId);
      promptSystem = `Instruções do Sistema:
- Use o nome ${clientName} nas respostas.
- Máximo de ${aiSettings.maxTokens} tokens.
- Inicie com 'Ação: Transferir para o setor de atendimento' quando necessário.
- Responda em blocos curtos (1 a 4), separados por uma linha em branco; cada bloco com até 3–4 frases; evite texto muito longo.
- Funil inteligente: (1) entenda necessidade com 1–2 perguntas objetivas por vez; (2) ofereça vídeo/material quando pedirem ou quando ajudar a qualificar; (3) só convide para demo ou reunião com data/hora depois de interesse claro ou após qualificação — interesse genérico ("quero ver como funciona") não exige agendamento imediato; primeiro esclareça e qualifique.
- Perguntas curtas e claras do cliente (ex.: "Tem vídeo?", "Tem PDF?", "Manda material") sempre têm intenção compreensível: responda de forma útil, nunca diga que não entendeu.
- Se a solicitação for ambígua, peça esclarecimentos de forma breve.
- Quando realmente não houver como interpretar o pedido, responda: "Desculpe, não consegui entender sua mensagem. Pode reformular?"
${roleLang ? `\n${roleLang}` : ""}${roleForm ? `\n${roleForm}` : ""}${roleFunc ? `\n${roleFunc}` : ""}${rolePers ? `\n${rolePers}` : ""}${roleEmoji ? `\n${roleEmoji}` : ""}${roleGreet ? `\n${roleGreet}` : ""}${roleBye ? `\n${roleBye}` : ""}${roleInstr ? `\n${roleInstr}` : ""}
${promptExt.brainBlock}
${promptExt.proactiveBlock ? `${promptExt.proactiveBlock}\n` : ""}
${promptExt.actionsBlock}
${aiSettings.prompt}`;
    }

    // Processar mensagem de texto
    if (bodyMessage.trim()) {
      await onAgentUserInboundText(ticket, bodyMessage);
      const scheduleAttempt = await tryScheduleMeeting(bodyMessage, ticket, contact, messages);
      if (scheduleAttempt.handled) {
        const when = scheduleAttempt.when!;
        const text = `Reunião agendada com sucesso para ${format(when, "dd/MM/yyyy")} às ${format(when, "HH:mm")}.`;
        const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: text
        });
        await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
        return;
      }
      const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);

      try {
        let responseText: string | null = null;

        if (isOpenAIModel && openai) {
          messagesAI.push({ role: "user", content: bodyMessage });
          responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings, ticket);
        } else if (isGeminiModel && gemini) {
          responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, bodyMessage, promptSystem, ticket);
        }

        if (!responseText) {
          logger.error("[AI SERVICE] Nenhuma resposta do provedor de IA");
          return;
        }

        const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
        const responseForClient = stripInboundMediaMarkers(responseText);

        const priorOutboundText = await Message.count({
          where: { ticketId: ticket.id, fromMe: true }
        });
        const outcomeText = await processResponse(
          responseForClient,
          wbot,
          msg,
          ticket,
          contact,
          aiSettings,
          ticketTraking
        );
        await maybeSendInboundReplyMedia({
          ticket,
          contact,
          priorOutboundCount: priorOutboundText,
          outcome: outcomeText,
          userInboundText: bodyMessage,
          assistantRawText: responseText,
          hadExplicitMediaMarker: hadInboundMediaMarker
        });

        logger.info(`[AI SERVICE] Resposta processada com sucesso para ticket ${ticket.id}`);

        // APÓS RESPOSTA: Verificar se deve continuar fluxo por objetivo completado
        if (isTemporaryMode && aiSettings.autoCompleteOnObjective && aiSettings.objective && openai) {
          const recentMessages = await Message.findAll({
            where: historyWhere,
            order: [["createdAt", "DESC"]],
            limit: 10
          });

          const objectiveCompleted = await checkObjectiveCompletion(
            aiSettings.objective,
            recentMessages,
            openai,
            ticket
          );

          if (objectiveCompleted) {
            logger.info(`[AI SERVICE] Objetivo completado automaticamente - ticket ${ticket.id}`);
            return await returnToFlow(ticket, "objective_completed");
          }
        }

      } catch (error: any) {
        logger.error("[AI SERVICE] Falha na requisição para IA:", error);

        const errorMessage = "Desculpe, estou com dificuldades técnicas para processar sua solicitação no momento. Por favor, tente novamente mais tarde.";

        const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: errorMessage
        });

        await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
      }
    }
    // Processar áudio (apenas para OpenAI)
    else if (msg.message?.audioMessage && mediaSent && isOpenAIModel) {
      if (!openai) {
        logger.error("[AI SERVICE] Sessão OpenAI necessária para transcrição mas não inicializada");
      await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: "Desculpe, a transcrição de áudio não está configurada corretamente."
        });
        return;
      }

      try {
        const mediaUrl = mediaSent.mediaUrl!.split("/").pop();
        const audioFilePath = `${publicFolder}/${mediaUrl}`;

        if (!fs.existsSync(audioFilePath)) {
          logger.error(`[AI SERVICE] Arquivo de áudio não encontrado: ${audioFilePath}`);
          await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "Desculpe, não foi possível processar seu áudio. Por favor, tente novamente."
          });
          return;
        }

        const file = fs.createReadStream(audioFilePath);
        logAiCallDebug("OpenAiService.ts:handleOpenAiFlow:whisper", ticket, "(whisper-1 audio.transcriptions — sem chat system prompt)");
        const transcriptionResult = await openai.audio.transcriptions.create({
          model: "whisper-1",
          file: file,
        });

        const transcription = transcriptionResult.text;

        if (!transcription) {
          logger.warn("[AI SERVICE] Transcrição vazia recebida");
          await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "Desculpe, não consegui entender o áudio. Tente novamente ou envie uma mensagem de texto."
          });
          return;
        }

        // Enviar transcrição para o usuário
        const sentTranscriptMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: `🎤 *Sua mensagem de voz:* ${transcription}`,
        });
        await verifyMessage(sentTranscriptMessage!, ticket, contact, ticketTraking, true, false, true);

        // Obter resposta da IA para a transcrição
        const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);
        let responseText: string | null = null;

        if (isOpenAIModel) {
          messagesAI.push({ role: "user", content: transcription });
          responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings, ticket);
        } else if (isGeminiModel && gemini) {
          responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, transcription, promptSystem, ticket);
        }

        if (responseText) {
          const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
          const responseForClient = stripInboundMediaMarkers(responseText);
          const priorOutboundAudio = await Message.count({
            where: { ticketId: ticket.id, fromMe: true }
          });
          const outcomeAudio = await processResponse(
            responseForClient,
            wbot,
            msg,
            ticket,
            contact,
            aiSettings,
            ticketTraking
          );
          await maybeSendInboundReplyMedia({
            ticket,
            contact,
            priorOutboundCount: priorOutboundAudio,
            outcome: outcomeAudio,
            userInboundText: transcription,
            assistantRawText: responseText,
            hadExplicitMediaMarker: hadInboundMediaMarker
          });
        }

      } catch (error: any) {
        logger.error("[AI SERVICE] Erro no processamento de áudio:", error);
        const errorMessage = error?.response?.error?.message || error.message || "Erro desconhecido";
        const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: `Desculpe, houve um erro ao processar seu áudio: ${errorMessage}`,
        });
        await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
      }
    } else if ((msg.message?.imageMessage || msg.message?.stickerMessage) && mediaSent) {
      try {
        const { vision, ack } = await loadProactiveMediaFlags(ticket.companyId);
        const fileName = typeof mediaSent.mediaUrl === "string" ? mediaSent.mediaUrl.split("/").pop() : null;
        const publicFolderLocal: string = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public",
          `company${ticket.companyId}`
        );
        const filePath = fileName ? path.join(publicFolderLocal, fileName) : null;

        if (isGeminiModel && gemini) {
          const model = gemini.getGenerativeModel({
            model: aiSettings.model,
            systemInstruction: promptSystem,
          });

          const geminiHistory: Content[] = (prepareMessagesAI(messages, isGeminiModel, promptSystem)).map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          if (!filePath || !fs.existsSync(filePath)) {
            const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
              text: "Recebi uma imagem, mas não consegui acessá-la para análise. Por favor, tente reenviar."
            });
            await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
            return;
          }

          const fileBuffer = fs.readFileSync(filePath);
          const imagePart: Part = {
            inlineData: {
              data: fileBuffer.toString("base64"),
              mimeType: "image/jpeg"
            }
          };

          const chat = model.startChat({ history: geminiHistory });
          const promptText = "Descreva a imagem e responda ao usuário considerando o contexto da conversa.";
          logAiCallDebug(
            "OpenAiService.ts:handleOpenAiFlow:visionGemini",
            ticket,
            `[systemInstruction]\n${promptSystem}\n[user template]\n${promptText}`
          );
          const result = await chat.sendMessage([{ text: promptText }, imagePart]);
          const responseText = result.response.text();

          if (responseText) {
            const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
            const textOut = stripInboundMediaMarkers(responseText);
            const priorImGem = await Message.count({
              where: { ticketId: ticket.id, fromMe: true }
            });
            const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
              text: `\u200e ${textOut}`
            });
            await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
            await maybeSendInboundReplyMedia({
              ticket,
              contact,
              priorOutboundCount: priorImGem,
              outcome: "sent",
              userInboundText: bodyMessage || "",
              assistantRawText: responseText,
              hadExplicitMediaMarker: hadInboundMediaMarker
            });
          }
        } else if (isOpenAIModel && openai && vision && filePath && fs.existsSync(filePath)) {
          const buf = fs.readFileSync(filePath);
          const mimeGuess = msg.message?.stickerMessage ? "image/webp" : "image/jpeg";
          const b64 = buf.toString("base64");
          const dataUrl = `data:${mimeGuess};base64,${b64}`;
          const messagesAI = prepareMessagesAI(messages, false, promptSystem);
          const userLine =
            "O cliente enviou uma imagem ou figurinho. Descreva o que for relevante e responda de forma breve e útil.";
          messagesAI.push({
            role: "user",
            content: [
              { type: "text", text: userLine },
              { type: "image_url", image_url: { url: dataUrl } }
            ] as any
          });
          const visionModel = pickVisionModel(aiSettings.model);
          logAiCallDebug("OpenAiService.ts:handleOpenAiFlow:visionOpenAi", ticket, promptSystem);
          const chat = await openai.chat.completions.create({
            model: visionModel,
            messages: messagesAI as any,
            max_tokens: Math.min(aiSettings.maxTokens || 500, 800),
            temperature: aiSettings.temperature
          });
          const responseText = (chat.choices[0]?.message?.content || "").trim();
          if (responseText) {
            const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
            const textOut = stripInboundMediaMarkers(responseText);
            const priorImOai = await Message.count({
              where: { ticketId: ticket.id, fromMe: true }
            });
            const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
              text: `\u200e ${textOut}`
            });
            await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
            await maybeSendInboundReplyMedia({
              ticket,
              contact,
              priorOutboundCount: priorImOai,
              outcome: "sent",
              userInboundText: bodyMessage || "",
              assistantRawText: responseText,
              hadExplicitMediaMarker: hadInboundMediaMarker
            });
          }
        } else if (ack) {
          const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "\u200e Recebi sua imagem! Se quiser que eu analise com mais detalhe, ative OpenAI Vision em Proativo & mídia ou descreva em texto o que precisa."
          });
          await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
        } else {
          const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "\u200e Ainda não consigo analisar imagens com esta configuração. Por favor, descreva em texto."
          });
          await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
        }
      } catch (error: any) {
        logger.error("[AI SERVICE] Erro ao processar imagem:", error);
        const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
          text: "Houve um erro ao analisar sua imagem. Por favor, tente novamente."
        });
        await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
      }
    } else if (msg.message?.videoMessage && mediaSent) {
      try {
        const { ack } = await loadProactiveMediaFlags(ticket.companyId);
        const cap = bodyMessage?.trim() || "";
        const synthetic = `[Mídia recebida: vídeo]${cap ? ` Legenda: ${cap}` : ""} Reconheça o envio e responda de forma breve; se precisar de análise detalhada, peça que descrevam em texto.`;
        const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);
        let responseText: string | null = null;
        if (isOpenAIModel && openai) {
          messagesAI.push({ role: "user", content: synthetic });
          responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings, ticket);
        } else if (isGeminiModel && gemini) {
          responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, synthetic, promptSystem, ticket);
        }
        if (responseText) {
          const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
          const responseForClient = stripInboundMediaMarkers(responseText);
          const priorOutboundVid = await Message.count({
            where: { ticketId: ticket.id, fromMe: true }
          });
          const outcomeVid = await processResponse(
            responseForClient,
            wbot,
            msg,
            ticket,
            contact,
            aiSettings,
            ticketTraking
          );
          await maybeSendInboundReplyMedia({
            ticket,
            contact,
            priorOutboundCount: priorOutboundVid,
            outcome: outcomeVid,
            userInboundText: synthetic,
            assistantRawText: responseText,
            hadExplicitMediaMarker: hadInboundMediaMarker
          });
        } else if (ack) {
          const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "\u200e Recebi seu vídeo! Se precisar de algo específico, conte em texto que eu te ajudo."
          });
          await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
        }
      } catch (error: any) {
        logger.error("[AI SERVICE] Erro ao processar vídeo:", error);
      }
    } else if (msg.message?.documentMessage && mediaSent) {
      try {
        const { ack } = await loadProactiveMediaFlags(ticket.companyId);
        const fn = msg.message.documentMessage?.fileName || "documento";
        const synthetic = `[Mídia recebida: documento: ${fn}] Reconheça o envio e ofereça ajuda; para análise profunda, peça um resumo em texto do que precisa.`;
        const messagesAI = prepareMessagesAI(messages, isGeminiModel, promptSystem);
        let responseText: string | null = null;
        if (isOpenAIModel && openai) {
          messagesAI.push({ role: "user", content: synthetic });
          responseText = await handleOpenAIRequest(openai, messagesAI, aiSettings, ticket);
        } else if (isGeminiModel && gemini) {
          responseText = await handleGeminiRequest(gemini, messagesAI, aiSettings, synthetic, promptSystem, ticket);
        }
        if (responseText) {
          const hadInboundMediaMarker = hasInboundMediaMarker(responseText);
          const responseForClient = stripInboundMediaMarkers(responseText);
          const priorOutboundDoc = await Message.count({
            where: { ticketId: ticket.id, fromMe: true }
          });
          const outcomeDoc = await processResponse(
            responseForClient,
            wbot,
            msg,
            ticket,
            contact,
            aiSettings,
            ticketTraking
          );
          await maybeSendInboundReplyMedia({
            ticket,
            contact,
            priorOutboundCount: priorOutboundDoc,
            outcome: outcomeDoc,
            userInboundText: synthetic,
            assistantRawText: responseText,
            hadExplicitMediaMarker: hadInboundMediaMarker
          });
        } else if (ack) {
          const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: "\u200e Recebi seu arquivo! Diga em poucas palavras o que você precisa que eu faça com ele."
          });
          await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
        }
      } catch (error: any) {
        logger.error("[AI SERVICE] Erro ao processar documento:", error);
      }
    } else if (msg.message?.audioMessage && isGeminiModel) {
      // Gemini não suporta áudio, apenas texto
      const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
        text: "Desculpe, no momento só posso processar mensagens de texto. Por favor, envie sua pergunta por escrito.",
      });
      await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
    }

  } catch (error) {
    logger.error("[AI SERVICE] Erro geral no serviço:", error);

    try {
      const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
        text: "Desculpe, ocorreu um erro interno. Por favor, tente novamente mais tarde.",
      });
      await verifyMessage(sentMessage!, ticket, contact, ticketTraking, true, false, true);
    } catch (sendError) {
      logger.error("[AI SERVICE] Erro ao enviar mensagem de erro:", sendError);
    }
  }
};

export default handleOpenAiFlow;
