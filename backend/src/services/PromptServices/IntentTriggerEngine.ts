/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * IntentTriggerEngine (PR 12)
 *
 * Classifica a saída do agente IA (texto gerado pela LLM) ANTES de enviá-la ao cliente
 * e registra intents pendentes em `ticket.dataWebhook.agentState.pendingIntents`.
 *
 * Heurística determinística (default zero-custo). Camada LLM opcional via env
 * AGENT_INTENT_LLM_MODE = `heuristic` | `auto` | `llm` (default `heuristic`).
 *
 * Pluga em `wbotMessageListener.ts` logo após `clipPrematureAssistantProgressAfterQuestion`.
 *
 * Sem PR 17 (flag global), este módulo NÃO é chamado em runtime.
 */

import logger from "../../utils/logger";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { assistantTextImpliesTransferToHuman } from "../../helpers/assistantTransferIntent";
import Ticket from "../../models/Ticket";
import Prompt from "../../models/Prompt";
import PromptSmartAction from "../../models/PromptSmartAction";
import {
  semanticMatchAssistantSmartActions,
  shouldRunSemanticOpenAiMatch
} from "./IntentTriggerSemanticOpenAi";
import { assistantTextImpliesSchedulingOffer } from "../../helpers/assistantScheduleIntent";
import { assistantTextMatchesActionTriggers } from "../../helpers/assistantCrmActionIntent";

export type AgentIntentKind =
  | "schedule"
  | "transfer"
  | "create_lead"
  | "create_activity"
  | "create_contact"
  | "send_link"
  | "check_agenda"
  | "consult_products"
  | "passar_preco"
  | "consult_stock"
  | "send_product_link"
  | "register_purchase_intent"
  | "custom";

export interface AgentIntentMatch {
  kind: AgentIntentKind;
  smartActionId?: number;
  slug?: string;
  confidence: number;
  matchedPattern?: string;
  satisfiedBy: "date" | "confirmation" | "auto" | "any";
  maxAgeMinutes: number;
}

export interface PendingIntent extends AgentIntentMatch {
  registeredAt: string;
  satisfiedAt?: string;
  attempts?: number;
}

export interface AgentIntentClassification {
  intents: AgentIntentMatch[];
  source: "heuristic" | "llm";
}

const KIND_DEFAULTS: Record<AgentIntentKind, { satisfiedBy: PendingIntent["satisfiedBy"]; maxAgeMinutes: number }> = {
  schedule: { satisfiedBy: "date", maxAgeMinutes: 30 },
  transfer: { satisfiedBy: "confirmation", maxAgeMinutes: 10 },
  create_lead: { satisfiedBy: "any", maxAgeMinutes: 30 },
  create_activity: { satisfiedBy: "any", maxAgeMinutes: 30 },
  create_contact: { satisfiedBy: "any", maxAgeMinutes: 30 },
  send_link: { satisfiedBy: "auto", maxAgeMinutes: 10 },
  check_agenda: { satisfiedBy: "date", maxAgeMinutes: 30 },
  consult_products: { satisfiedBy: "any", maxAgeMinutes: 30 },
  passar_preco: { satisfiedBy: "any", maxAgeMinutes: 30 },
  consult_stock: { satisfiedBy: "any", maxAgeMinutes: 30 },
  send_product_link: { satisfiedBy: "any", maxAgeMinutes: 30 },
  register_purchase_intent: { satisfiedBy: "any", maxAgeMinutes: 30 },
  custom: { satisfiedBy: "any", maxAgeMinutes: 30 }
};

interface HeuristicRule {
  kind: AgentIntentKind;
  pattern: RegExp;
  confidence: number;
  description: string;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  {
    kind: "schedule",
    pattern: /\b(gostaria|quer|deseja|posso|podemos|vamos|queria|gostariam)\s+(de\s+)?(agendar|marcar|reservar|reagendar)\b/i,
    confidence: 0.92,
    description: "convite explícito de agendar"
  },
  {
    kind: "schedule",
    pattern: /\b(qual|quando|que\s+(dia|hora|hor[áa]rio))\b[^?]{0,40}\?\s*$/i,
    confidence: 0.55,
    description: "pergunta de data/horário"
  },
  {
    kind: "schedule",
    pattern: /\b(prefere\s+que\s+dia|melhor\s+(dia|hor[áa]rio))\b/i,
    confidence: 0.78,
    description: "pergunta preferência de dia/horário"
  },
  {
    kind: "schedule",
    pattern: /\bme\s+passe\s+(o\s+)?(dia|hor[áa]rio|data)\b/i,
    confidence: 0.8,
    description: "pede data explícita"
  },
  {
    kind: "transfer",
    pattern: /\b(vou|irei)\s+(te\s+)?transfer(ir|i-lo|i-la)\b/i,
    confidence: 0.95,
    description: "declara transferência"
  },
  {
    kind: "transfer",
    pattern: /\b(passar|encaminhar)\s+(para\s+)?(um\s+)?atendente\b/i,
    confidence: 0.92,
    description: "encaminhar para atendente"
  },
  {
    kind: "create_contact",
    pattern: /\b(vou\s+)?(registrar|criar|atualizar|salvar)\s+(seu\s+)?contato\b/i,
    confidence: 0.88,
    description: "prepara criação/atualização de contato"
  },
  {
    kind: "send_link",
    pattern: /\b(vou\s+(te\s+)?enviar|segue|aqui\s+est[áa])\s+(o\s+)?link\b/i,
    confidence: 0.9,
    description: "vai enviar link"
  },
  {
    kind: "check_agenda",
    pattern: /\b(vou|deixa\s+eu)\s+(verificar|conferir|checar)\s+(a\s+)?(agenda|disponibilidade)/i,
    confidence: 0.88,
    description: "vai checar agenda"
  },
  {
    kind: "consult_products",
    pattern: /\b(temos|oferecemos)\s+(os\s+)?(seguintes|estes)\s+produtos\b/i,
    confidence: 0.75,
    description: "lista produtos"
  },
  {
    kind: "passar_preco",
    pattern: /\b(o\s+valor\s+(é|fica)|custa|preço|pre[çc]o\s+é|investimento\s+(é|fica))\b/i,
    confidence: 0.7,
    description: "fornece preço"
  },
  {
    kind: "consult_stock",
    pattern: /\b(vou\s+verificar\s+o\s+estoque|conferir\s+a\s+disponibilidade|checar\s+se\s+ainda\s+tem|quantas\s+unidades\s+temos)\b/i,
    confidence: 0.85,
    description: "consulta estoque"
  },
  {
    kind: "send_product_link",
    pattern: /\b(segue\s+o\s+link\s+de\s+compra|enviar\s+o\s+link\s+do\s+produto|pode\s+comprar\s+por\s+este\s+link)\b/i,
    confidence: 0.88,
    description: "envia link do produto"
  },
  {
    kind: "register_purchase_intent",
    pattern: /\b(registrar\s+seu\s+interesse|anotar\s+que\s+voc[eê]\s+quer\s+comprar|deixar\s+sua\s+inten[cç][aã]o\s+registrada)\b/i,
    confidence: 0.88,
    description: "registra intenção de compra"
  }
];

function normalizeTriggerText(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function smartActionTypeToIntentKind(action: PromptSmartAction): AgentIntentKind {
  const t = String(action.type || "").toLowerCase();
  const s = String(action.slug || "").toLowerCase();
  if (t === "agendamento" || /agend|marcar|reserv/.test(s)) return "schedule";
  if (t === "transferir" || /transfer/.test(s)) return "transfer";
  if (t === "criar_lead" || /lead/.test(s)) return "create_lead";
  if (t === "criar_atividade" || /atividade|tarefa|lembrete/.test(s)) return "create_activity";
  if (t === "criar_contato" || /contato/.test(s)) return "create_contact";
  if (t === "enviar_link_produto" || /enviarlinkproduto|linkproduto/.test(s))
    return "send_product_link";
  if (t === "consultar_estoque" || /consultarestoque|estoque/.test(s)) return "consult_stock";
  if (t === "registrar_intencao_compra" || /registrarintencaocompra|intencao/.test(s))
    return "register_purchase_intent";
  if (t === "enviar_link" || (/link/.test(s) && !/produto/.test(s))) return "send_link";
  if (t === "consultar_agenda" || /agenda/.test(s)) return "check_agenda";
  if (t === "consultar_produtos") return "consult_products";
  if (t === "preco" || /pre[cç]o|valor/.test(s)) return "passar_preco";
  return "custom";
}

function triggerPatternMatches(text: string, pattern: string): boolean {
  const p = String(pattern || "").trim();
  if (!p) return false;
  if (p.startsWith("/") && p.endsWith("/") && p.length > 2) {
    try {
      return new RegExp(p.slice(1, -1), "i").test(text);
    } catch {
      return false;
    }
  }
  return normalizeTriggerText(text).includes(normalizeTriggerText(p));
}

/**
 * Aplica regras heurísticas ao texto. Retorna no máximo 1 match por kind (o mais forte).
 */
export function classifyAgentOutboundHeuristic(text: string): AgentIntentMatch[] {
  const raw = String(text || "");
  if (!raw.trim()) return [];

  if (/ação:\s*transferir/i.test(raw)) {
    // Mensagem técnica do roteiro; não duplicar transfer.
  }

  const byKind = new Map<AgentIntentKind, AgentIntentMatch>();
  for (const rule of HEURISTIC_RULES) {
    if (rule.pattern.test(raw)) {
      const existing = byKind.get(rule.kind);
      if (!existing || rule.confidence > existing.confidence) {
        byKind.set(rule.kind, {
          kind: rule.kind,
          confidence: rule.confidence,
          matchedPattern: rule.description,
          satisfiedBy: KIND_DEFAULTS[rule.kind].satisfiedBy,
          maxAgeMinutes: KIND_DEFAULTS[rule.kind].maxAgeMinutes
        });
      }
    }
  }

  // Reforço transfer: usa o detector legado também.
  if (!byKind.has("transfer") && assistantTextImpliesTransferToHuman(raw)) {
    byKind.set("transfer", {
      kind: "transfer",
      confidence: 0.9,
      matchedPattern: "assistantTextImpliesTransferToHuman",
      satisfiedBy: KIND_DEFAULTS.transfer.satisfiedBy,
      maxAgeMinutes: KIND_DEFAULTS.transfer.maxAgeMinutes
    });
  }

  if (!byKind.has("schedule") && assistantTextImpliesSchedulingOffer(raw)) {
    byKind.set("schedule", {
      kind: "schedule",
      confidence: 0.9,
      matchedPattern: "assistantTextImpliesSchedulingOffer",
      satisfiedBy: KIND_DEFAULTS.schedule.satisfiedBy,
      maxAgeMinutes: KIND_DEFAULTS.schedule.maxAgeMinutes
    });
  }

  return Array.from(byKind.values()).sort((a, b) => b.confidence - a.confidence);
}

async function classifyConfiguredSmartActionTriggers(
  text: string,
  prompt: Prompt | null,
  ticket: Ticket
): Promise<{ matches: AgentIntentMatch[]; semanticUsed: boolean }> {
  if (!prompt || !String(text || "").trim()) return { matches: [], semanticUsed: false };
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    const out: AgentIntentMatch[] = [];
    const matchedBySubstring = new Set<number>();
    for (const action of actions) {
      if ((action as any).enabled === false) continue;
      const patterns = Array.isArray((action as any).agentTriggerPatterns)
        ? ((action as any).agentTriggerPatterns as unknown[])
        : [];
      const matched = patterns.find((p) => triggerPatternMatches(text, String(p || "")));
      if (!matched) continue;
      const kind = smartActionTypeToIntentKind(action);
      if (kind === "transfer" && !assistantTextImpliesTransferToHuman(text)) continue;
      if (kind === "schedule" && !assistantTextImpliesSchedulingOffer(text)) continue;
      const agentPatterns = Array.isArray((action as any).agentTriggerPatterns)
        ? ((action as any).agentTriggerPatterns as unknown[]).map((p) => String(p || ""))
        : [];
      if (kind === "create_lead" && !assistantTextMatchesActionTriggers(text, agentPatterns)) continue;
      if (kind === "create_activity" && !assistantTextMatchesActionTriggers(text, agentPatterns)) continue;
      matchedBySubstring.add(action.id);
      out.push({
        kind,
        smartActionId: action.id,
        slug: String(action.slug || ""),
        confidence: 0.94,
        matchedPattern: String(matched),
        satisfiedBy: KIND_DEFAULTS[kind]?.satisfiedBy || "any",
        maxAgeMinutes: KIND_DEFAULTS[kind]?.maxAgeMinutes || 30
      });
    }

    let semanticUsed = false;
    const apiKey = String((prompt as any).apiKey || "").trim();
    if (shouldRunSemanticOpenAiMatch(apiKey)) {
      const candidates = actions
        .filter((a) => (a as any).enabled !== false)
        .filter((a) => !matchedBySubstring.has(a.id))
        .map((a) => {
          const patterns = Array.isArray((a as any).agentTriggerPatterns)
            ? ((a as any).agentTriggerPatterns as unknown[])
                .map((p) => String(p || "").trim())
                .filter(Boolean)
            : [];
          return {
            id: a.id,
            slug: String(a.slug || ""),
            name: String(a.name || ""),
            agentHints: patterns.slice(0, 20)
          };
        })
        .filter((c) => c.agentHints.length > 0);

      if (candidates.length) {
        const modelRaw = String((prompt as any).model || "").trim();
        const ids = await semanticMatchAssistantSmartActions({
          assistantMessage: text,
          candidates,
          apiKey,
          model: modelRaw || undefined
        });
        if (ids.length) semanticUsed = true;
        for (const id of ids) {
          const action = actions.find((x) => x.id === id);
          if (!action || (action as any).enabled === false) continue;
          const kind = smartActionTypeToIntentKind(action);
          if (kind === "transfer" && !assistantTextImpliesTransferToHuman(text)) continue;
          if (kind === "schedule" && !assistantTextImpliesSchedulingOffer(text)) continue;
          const agentPatterns = Array.isArray((action as any).agentTriggerPatterns)
            ? ((action as any).agentTriggerPatterns as unknown[]).map((p) => String(p || ""))
            : [];
          if (kind === "create_lead" && !assistantTextMatchesActionTriggers(text, agentPatterns)) continue;
          if (kind === "create_activity" && !assistantTextMatchesActionTriggers(text, agentPatterns)) continue;
          out.push({
            kind,
            smartActionId: action.id,
            slug: String(action.slug || ""),
            confidence: 0.88,
            matchedPattern: "openai_semantic_trigger",
            satisfiedBy: KIND_DEFAULTS[kind]?.satisfiedBy || "any",
            maxAgeMinutes: KIND_DEFAULTS[kind]?.maxAgeMinutes || 30
          });
        }
      }
    }

    return { matches: out, semanticUsed };
  } catch (e) {
    logger.warn("[IntentTrigger] configured smart action triggers falharam:", e as any);
    return { matches: [], semanticUsed: false };
  }
}

/**
 * Resolve smart-action ids correspondentes a cada intent kind, no contexto do prompt.
 * Faz lookup leve, falha graciosamente quando a tabela não existe.
 */
async function resolveSmartActionIdsForIntents(
  intents: AgentIntentMatch[],
  prompt: Prompt | null,
  ticket: Ticket
): Promise<AgentIntentMatch[]> {
  if (!intents.length || !prompt) return intents;
  try {
    const all = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId: ticket.companyId }
    });
    if (!all.length) return intents;

    const findByKind = (kind: AgentIntentKind): PromptSmartAction | null => {
      const t = (a: PromptSmartAction) => String(a.type || "").toLowerCase();
      const s = (a: PromptSmartAction) => String(a.slug || "").toLowerCase();
      switch (kind) {
        case "schedule":
          return (
            all.find((a) => t(a) === "agendamento") ||
            all.find((a) => /agend|marcar|reserv/.test(s(a))) ||
            null
          );
        case "transfer":
          return (
            all.find((a) => t(a) === "transferir") ||
            all.find((a) => /transfer/.test(s(a))) ||
            null
          );
        case "create_lead":
          return (
            all.find((a) => t(a) === "criar_lead") ||
            all.find((a) => /lead/.test(s(a))) ||
            null
          );
        case "create_activity":
          return (
            all.find((a) => t(a) === "criar_atividade") ||
            all.find((a) => /atividade|tarefa|lembrete/.test(s(a))) ||
            null
          );
        case "create_contact":
          return (
            all.find((a) => t(a) === "criar_contato") ||
            all.find((a) => /contato/.test(s(a))) ||
            null
          );
        case "send_link":
          return (
            all.find((a) => t(a) === "enviar_link") ||
            all.find((a) => /link/.test(s(a))) ||
            null
          );
        case "check_agenda":
          return (
            all.find((a) => t(a) === "consultar_agenda") ||
            all.find((a) => /agenda/.test(s(a))) ||
            null
          );
        case "consult_products":
          return all.find((a) => t(a) === "consultar_produtos") || null;
        case "passar_preco":
          return (
            all.find((a) => t(a) === "preco") ||
            all.find((a) => /pre[cç]o/.test(s(a))) ||
            null
          );
        case "consult_stock":
          return all.find((a) => t(a) === "consultar_estoque") || null;
        case "send_product_link":
          return all.find((a) => t(a) === "enviar_link_produto") || null;
        case "register_purchase_intent":
          return all.find((a) => t(a) === "registrar_intencao_compra") || null;
        default:
          return null;
      }
    };

    return intents.map((i) => {
      if (i.smartActionId) return i;
      const row = findByKind(i.kind);
      if (row) {
        return { ...i, smartActionId: row.id, slug: String(row.slug || "") };
      }
      return i;
    });
  } catch (e) {
    logger.warn("[IntentTrigger] resolveSmartActionIds falhou (graceful):", e as any);
    return intents;
  }
}

export interface ClassifyAgentOutboundOpts {
  mode?: "heuristic" | "auto" | "llm";
}

export async function classifyAgentOutbound(
  response: string,
  prompt: Prompt | null,
  ticket: Ticket,
  opts: ClassifyAgentOutboundOpts = {}
): Promise<AgentIntentClassification> {
  const mode = (
    opts.mode ||
    String(process.env.AGENT_INTENT_LLM_MODE || "heuristic").toLowerCase()
  ) as "heuristic" | "auto" | "llm";

  const heuristic = classifyAgentOutboundHeuristic(response);
  const { matches: configuredMatches, semanticUsed } = await classifyConfiguredSmartActionTriggers(
    response,
    prompt,
    ticket
  );
  const mergedByKind = new Map<AgentIntentKind, AgentIntentMatch>();
  for (const intent of [...heuristic, ...configuredMatches]) {
    const existing = mergedByKind.get(intent.kind);
    if (!existing || intent.confidence > existing.confidence) {
      mergedByKind.set(intent.kind, intent);
    }
  }
  const merged = Array.from(mergedByKind.values()).sort((a, b) => b.confidence - a.confidence);

  // Camada LLM é "opt-in via flag". Mantemos esqueleto para crescimento posterior.
  if (mode === "llm" || (mode === "auto" && merged.length === 0)) {
    // Heurística é zero-custo; mantemos a camada LLM stubbed mas honesta.
    // Para PR 12 entrega-se apenas o caminho heurístico (default) — coberto pelos testes.
    // Quando AGENT_INTENT_LLM_MODE=llm for ativado, a camada LLM real pode ser plugada aqui.
  }

  const resolved = await resolveSmartActionIdsForIntents(merged, prompt, ticket);
  const filtered = resolved.filter((i) => {
    if (i.kind === "transfer") return assistantTextImpliesTransferToHuman(response);
    if (i.kind === "schedule") return assistantTextImpliesSchedulingOffer(response);
    return true;
  });
  const enabledOnly = prompt?.id
    ? await filterIntentsToEnabledSmartActions(filtered, prompt, ticket.companyId)
    : filtered;
  const source: AgentIntentClassification["source"] = semanticUsed ? "llm" : "heuristic";
  return { intents: enabledOnly, source };
}

/**
 * Mescla novas intents nas pendentes (sem duplicar mesmo kind) e persiste no ticket.
 */
export async function registerPendingIntents(
  ticket: Ticket,
  intents: AgentIntentMatch[]
): Promise<PendingIntent[]> {
  if (!ticket) return [];
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const existing: PendingIntent[] = Array.isArray(agentState.pendingIntents)
    ? (agentState.pendingIntents as PendingIntent[])
    : [];

  const now = new Date();
  const fresh: PendingIntent[] = [];
  const byKind = new Map<string, PendingIntent>();
  for (const e of existing) {
    if (!e || typeof e !== "object" || !e.kind) continue;
    if (!e.registeredAt) {
      e.registeredAt = now.toISOString();
    }
    const regAt = new Date(e.registeredAt).getTime();
    const ageMin = (now.getTime() - regAt) / 60000;
    const maxAge = Number.isFinite(e.maxAgeMinutes) ? e.maxAgeMinutes : 30;
    if (ageMin > maxAge) continue;
    byKind.set(e.kind, e);
    fresh.push(e);
  }

  for (const it of intents) {
    const prior = byKind.get(it.kind);
    if (prior) {
      // Reforça confiança / refresca timestamp.
      prior.confidence = Math.max(prior.confidence, it.confidence);
      prior.matchedPattern = prior.matchedPattern || it.matchedPattern;
      prior.smartActionId = prior.smartActionId || it.smartActionId;
      prior.slug = prior.slug || it.slug;
      prior.registeredAt = now.toISOString();
    } else {
      const p: PendingIntent = {
        ...it,
        registeredAt: now.toISOString(),
        attempts: 0
      };
      byKind.set(it.kind, p);
      fresh.push(p);
    }
  }

  // Cap em 6 pendentes simultâneas para evitar explosão.
  const trimmed = fresh.slice(-6);

  const nextDw = {
    ...dw,
    agentState: {
      ...agentState,
      pendingIntents: trimmed
    }
  };

  try {
    await (ticket as any).update({ dataWebhook: nextDw });
    (ticket as any).setDataValue && (ticket as any).setDataValue("dataWebhook", nextDw);
  } catch (e) {
    logger.warn("[IntentTrigger] falha ao persistir pendingIntents:", e as any);
  }

  return trimmed;
}

/** Kill-switch global (ops). Não substitui o switch enabled de cada ação no agente. */
export function isAgentIntentTriggerEnvDisabled(): boolean {
  const v = String(process.env.AGENT_INTENT_TRIGGER_ENABLED || "").toLowerCase().trim();
  if (!v) return false;
  return v === "0" || v === "false" || v === "no" || v === "off" || v === "disabled";
}

/** @deprecated Use shouldRunSmartActionTriggersForPrompt — respeita ações habilitadas no agente. */
export function isAgentIntentTriggerEnabled(): boolean {
  const v = String(process.env.AGENT_INTENT_TRIGGER_ENABLED || "").toLowerCase().trim();
  if (!v) return false;
  if (isAgentIntentTriggerEnvDisabled()) return false;
  return v === "1" || v === "true" || v === "yes" || v === "on" || v === "enabled";
}

export async function loadEnabledSmartActionsForPrompt(
  prompt: Prompt | null,
  companyId: number
): Promise<PromptSmartAction[]> {
  if (!prompt?.id || !companyId) return [];
  try {
    const all = await PromptSmartAction.findAll({
      where: { promptId: prompt.id, companyId }
    });
    return all.filter((a) => (a as any).enabled !== false);
  } catch (e) {
    logger.warn("[IntentTrigger] loadEnabledSmartActions falhou:", e as any);
    return [];
  }
}

function findEnabledActionByKind(
  kind: AgentIntentKind,
  enabled: PromptSmartAction[]
): PromptSmartAction | null {
  const t = (a: PromptSmartAction) => String(a.type || "").toLowerCase();
  const s = (a: PromptSmartAction) => String(a.slug || "").toLowerCase();
  switch (kind) {
    case "schedule":
      return (
        enabled.find((a) => t(a) === "agendamento") ||
        enabled.find((a) => /agend|marcar|reserv/.test(s(a))) ||
        null
      );
    case "transfer":
      return (
        enabled.find((a) => t(a) === "transferir") ||
        enabled.find((a) => /transfer/.test(s(a))) ||
        null
      );
    case "create_lead":
      return (
        enabled.find((a) => t(a) === "criar_lead") || enabled.find((a) => /lead/.test(s(a))) || null
      );
    case "create_activity":
      return (
        enabled.find((a) => t(a) === "criar_atividade") ||
        enabled.find((a) => /atividade|tarefa|lembrete/.test(s(a))) ||
        null
      );
    case "create_contact":
      return (
        enabled.find((a) => t(a) === "criar_contato") || enabled.find((a) => /contato/.test(s(a))) || null
      );
    case "send_link":
      return (
        enabled.find((a) => t(a) === "enviar_link") || enabled.find((a) => /link/.test(s(a))) || null
      );
    case "check_agenda":
      return (
        enabled.find((a) => t(a) === "consultar_agenda") || enabled.find((a) => /agenda/.test(s(a))) || null
      );
    case "consult_products":
      return enabled.find((a) => t(a) === "consultar_produtos") || null;
    case "passar_preco":
      return (
        enabled.find((a) => t(a) === "preco") || enabled.find((a) => /pre[cç]o/.test(s(a))) || null
      );
    case "consult_stock":
      return enabled.find((a) => t(a) === "consultar_estoque") || null;
    case "send_product_link":
      return enabled.find((a) => t(a) === "enviar_link_produto") || null;
    case "register_purchase_intent":
      return enabled.find((a) => t(a) === "registrar_intencao_compra") || null;
    default:
      return null;
  }
}

/** Gatilhos só rodam se existir ao menos uma ação inteligente ativa neste agente. */
export async function shouldRunSmartActionTriggersForPrompt(
  prompt: Prompt | null,
  ticket: Ticket
): Promise<boolean> {
  if (isAgentIntentTriggerEnvDisabled()) return false;
  const enabled = await loadEnabledSmartActionsForPrompt(prompt, ticket.companyId);
  return enabled.length > 0;
}

export async function filterIntentsToEnabledSmartActions(
  intents: AgentIntentMatch[],
  prompt: Prompt | null,
  companyId: number
): Promise<AgentIntentMatch[]> {
  if (!intents.length) return [];
  const enabled = await loadEnabledSmartActionsForPrompt(prompt, companyId);
  if (!enabled.length) return [];
  const enabledIds = new Set(enabled.map((a) => a.id));
  return intents
    .map((i) => {
      if (i.smartActionId && enabledIds.has(i.smartActionId)) return i;
      const row = findEnabledActionByKind(i.kind, enabled);
      if (!row) return null;
      return { ...i, smartActionId: row.id, slug: String(row.slug || i.slug || "") };
    })
    .filter((i): i is AgentIntentMatch => i != null);
}

export async function filterPendingIntentsToEnabledSmartActions(
  pending: PendingIntent[],
  prompt: Prompt | null,
  companyId: number
): Promise<PendingIntent[]> {
  if (!pending.length) return [];
  const enabled = await loadEnabledSmartActionsForPrompt(prompt, companyId);
  if (!enabled.length) return [];
  const enabledIds = new Set(enabled.map((a) => a.id));
  return pending.filter((p) => {
    if (p.smartActionId && enabledIds.has(p.smartActionId)) return true;
    return !!findEnabledActionByKind(p.kind, enabled);
  });
}
