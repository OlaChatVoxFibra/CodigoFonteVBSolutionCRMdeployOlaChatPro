/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowClassifierService (PR 4 — fluxo agente IA senior revamp).
 *
 * Classificador determinístico-first do TURNO do cliente: dado o texto recebido,
 * o passo ativo (Step IR + FlowUnderstanding) e o histórico curto, decide:
 *  - `intent`         : advance | correction | repeat | off_topic | noise | terminate
 *  - `targetStepId`   : a qual etapa essa mensagem se refere (geralmente a ativa)
 *  - `matchedBranch`  : qual branch do `branchesIR` foi satisfeito
 *  - `filledSlot`     : slot extraído (nome, tipo, valor canônico)
 *  - `correctionTarget` : etapa que o cliente quer corrigir
 *  - `confidence`     : 0..1
 *  - `source`         : 'llm' | 'fallback' | 'cache' | 'hybrid'
 *
 * Pipeline:
 *  1) Heurística determinística primeiro (cobre 70-80% dos casos comuns sem custo).
 *  2) Se confidence < threshold e modo permite LLM → chama LLM com JSON Schema.
 *  3) Se LLM retornar JSON inválido → cai pra heurística com warning.
 *  4) Cache LRU+TTL por hash do input → mesma combinação não recomputa.
 *
 * Feature flag: `ATTENDANCE_FLOW_CLASSIFIER_MODE = heuristic | auto | llm`.
 * Default: `heuristic` (sem custo, sem dependência externa).
 *
 * Output é PURO e sem efeito colateral — caller (motor v2 em PR 5) é que aplica.
 */

import OpenAI from "openai";
import crypto from "crypto";
import logger from "../../utils/logger";
import { OPENAI_DEFAULT_FAST_MODEL } from "../../config/openAiDefaults";
import { parseDateTimeFromText } from "../../helpers/parseDateTimeFromText";
import {
  isTrivialFlowInboundNoise,
  bodyLooksLikeDateOrPeriodReply,
  looksLikePricingOrOffTopicVersusDateQuestion,
  classifyScriptInboundTurn,
  looksLikeCustomerQuestion,
  looksLikeCustomerInterruption
} from "../../helpers/agentAttendanceFlowMemory";
import type {
  CompiledStepIR,
  ExpectedReplyKind,
  StepBranchIR
} from "../../helpers/compileAttendanceFlowIR";
import type {
  FlowUnderstanding,
  FlowUnderstandingStepNode
} from "./AttendanceFlowUnderstandingService";

export const FLOW_CLASSIFIER_SCHEMA_VERSION = 1;

export type ClassifierIntent =
  | "advance"
  | "correction"
  | "repeat"
  | "off_topic"
  | "noise"
  | "terminate";

export type ClassifierFilledSlot = {
  name: string;
  type: ExpectedReplyKind;
  /** Valor já normalizado (ISO date string, número, string da choice etc.). */
  value: string | number | null;
  /** Texto cru do cliente que originou o valor. */
  rawText: string;
};

export type ClassifierMatchedBranch = {
  matcher: StepBranchIR["matcher"];
  label: string;
  nextStepId: string | null;
};

export type ClassifierResult = {
  schemaVersion: number;
  intent: ClassifierIntent;
  targetStepId: string | null;
  matchedBranch: ClassifierMatchedBranch | null;
  filledSlot: ClassifierFilledSlot | null;
  correctionTarget: string | null;
  confidence: number;
  reasoning: string;
  source: "llm" | "fallback" | "cache" | "hybrid";
  /** Sinal semântico para o runtime: esta mensagem merece resposta visível agora. */
  shouldRespondNow?: boolean;
  /** Dados que ainda faltam para avançar/acionar uma ação, quando identificável. */
  missingInfo?: string[];
  /** Pergunta natural de reparo, se a resposta não resolver a etapa ativa. */
  nextNaturalQuestion?: string | null;
  /** Nunca deixar este turno terminar sem mensagem ou ação observável. */
  mustNotConsumeSilently?: boolean;
};

export type ClassifierHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

export type ClassifyTurnInput = {
  userText: string;
  /** Etapa atualmente apresentada ao cliente. */
  currentStep: CompiledStepIR;
  /** Etapas alternativas em que o cliente pode estar respondendo (raro). */
  candidateSteps?: CompiledStepIR[];
  /** Snapshot do `flowUnderstanding` para enriquecer a decisão (typicalReplies etc). */
  understanding?: FlowUnderstanding | null;
  /** Últimas 4–6 trocas (user/assistant) para captar "ah, errado, é dia 21". */
  conversationHistory?: ClassifierHistoryItem[];
  /** Respostas registradas em etapas anteriores — útil para detectar correção. */
  answersByStep?: Record<string, string>;
  /** API key OpenAI (se ausente e mode='llm', joga erro). */
  apiKey?: string | null;
  model?: string;
  mode?: "heuristic" | "auto" | "llm";
  /** Limite de confidence para tentar LLM em modo `auto`. Default 0.7. */
  llmFallbackThreshold?: number;
  /** Permite injetar client fake nos testes. */
  openaiClient?: any;
  /** Permite injetar `now` (testes determinísticos de "hoje"/"amanhã"). */
  now?: Date;
  /** Disable cache (testes). */
  disableCache?: boolean;
  /** Timeout em ms para a chamada LLM. */
  llmTimeoutMs?: number;
};

/* -------------------------------------------------------------------------- */
/*                                  Cache                                     */
/* -------------------------------------------------------------------------- */

type CacheEntry = { result: ClassifierResult; expiresAt: number };
const CACHE_MAX = 500;
const CACHE_TTL_MS = 60 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): ClassifierResult | null {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  /** LRU touch: move pro fim. */
  cache.delete(key);
  cache.set(key, e);
  return { ...e.result, source: "cache" };
}

function cacheSet(key: string, result: ClassifierResult): void {
  if (cache.size >= CACHE_MAX) {
    /** Map.iter() preserva ordem de inserção; primeiro é mais antigo. */
    const oldest = cache.keys().next().value;
    if (oldest != null) cache.delete(oldest);
  }
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearClassifierCacheForTests(): void {
  cache.clear();
}

function hashClassifyInput(input: ClassifyTurnInput): string {
  const payload = {
    userText: String(input.userText || "").trim().toLowerCase(),
    stepId: input.currentStep.stepId,
    expected: input.currentStep.expectedReply,
    slot: input.currentStep.slotName,
    history: (input.conversationHistory || []).slice(-4).map((h) => ({
      r: h.role,
      t: String(h.text || "").slice(0, 200)
    })),
    answers: input.answersByStep || {}
  };
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

/* -------------------------------------------------------------------------- */
/*                               Heurística                                   */
/* -------------------------------------------------------------------------- */

const CORRECTION_PHRASES =
  /\b(errado|errei|na verdade|deixa eu (mudar|trocar|corrigir)|quis dizer|n[aã]o\s+(?:era|foi)|me\s+enganei|corrigindo|alterar|mudar|trocar)\b/i;

const REPEAT_PHRASES =
  /\b(repete|repita|n[aã]o entendi|hein\??|c[ôo]mo|como\s+(?:assim|disse)|que isso|qual\??|de\s+novo|n[aã]o ouvi)\b/i;

const TERMINATE_PHRASES =
  /\b(j[áa]\s+resolvido|j[áa]\s+resolvi|chega|s[óo]\s+isso|parar|cancela(r)?|desisto|deixa)\b/i;

function isSingleEmojiOnly(text: string): boolean {
  const cleaned = String(text || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!cleaned) return true;
  /** Removendo emojis / espaços → sobra alguma letra/dígito? */
  const stripped = cleaned.replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\s]/gu, "");
  return stripped.length === 0;
}

function matchChoiceBranch(
  userText: string,
  branches: StepBranchIR[]
): { branch: StepBranchIR; matched: string } | null {
  const raw = String(userText || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!raw) return null;

  /** Menu numerado: "1" / "1)" / "1." → branch[0], "2" → branch[1], ... */
  const digitOnly = raw.match(/^(\d{1,2})\s*[\).\]]?\s*$/);
  if (digitOnly) {
    const idx = parseInt(digitOnly[1], 10) - 1;
    const branchOnly = branches.filter((b) => b.matcher !== "always");
    if (idx >= 0 && idx < branchOnly.length) {
      return { branch: branchOnly[idx], matched: digitOnly[1] };
    }
  }

  const norm = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  for (const b of branches) {
    if (b.matcher === "choice" || b.matcher === "semantic") {
      const target = String(b.value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim();
      if (target && (norm.includes(target) || (norm.length >= 4 && target.includes(norm)))) {
        return { branch: b, matched: b.value };
      }
    } else if (b.matcher === "regex") {
      try {
        const re = new RegExp(String(b.value), "i");
        if (re.test(raw)) return { branch: b, matched: b.value };
      } catch {
        /* ignore bad regex from author */
      }
    }
  }
  return null;
}

function parseYesNo(userText: string): "sim" | "nao" | null {
  const n = String(userText || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
  if (!n) return null;
  if (/^(sim|s|claro|com\s+certeza|ok|okay|positivo|isso|aham)\b/.test(n)) return "sim";
  if (/^(nao|n|negativo|tomara\s+que\s+nao|jamais)\b/.test(n)) return "nao";
  return null;
}

function parseNumberReply(userText: string): number | null {
  const raw = String(userText || "")
    .replace(/\u200e/g, "")
    .trim();
  if (!raw) return null;
  /** Aceita "5", "5 pessoas", "somos 4 adultos", "R$ 1.500,00", "duas". */
  const m = raw.match(/(-?\d+(?:[\.,]\d+)?)/);
  if (m) {
    const cleaned = m[1].replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  const wordMap: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10
  };
  const tokens = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/\s+/);
  for (const w of tokens) {
    if (wordMap[w] != null) return wordMap[w];
  }
  return null;
}

function normalizeForFlowMeaning(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastQuestionFromText(text: string): string | null {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/\?\s*$/.test(lines[i])) return lines[i];
  }
  return null;
}

function activeQuestionForStep(
  step: CompiledStepIR,
  understandingNode: FlowUnderstandingStepNode | null,
  history: ClassifierHistoryItem[] = []
): string {
  const fromHistory = [...history].reverse().find((item) => item.role === "assistant" && /\?\s*$/.test(item.text || ""));
  return String(
    understandingNode?.askedQuestion ||
      lastQuestionFromText(step.customerVisibleText) ||
      lastQuestionFromText(step.agentPrompt) ||
      fromHistory?.text ||
      ""
  ).trim();
}

function inferExpectedReplyFromQuestion(question: string): ExpectedReplyKind | null {
  const q = normalizeForFlowMeaning(question);
  if (!q) return null;
  if (/\b(data|dia|horario|hora|agenda|agendar|marcar|quando|periodo|manha|tarde|noite)\b/.test(q)) {
    return "date";
  }
  if (/\b(quantos|quantas|numero|número|idade|valor|preco|preço|orcamento|orçamento|r\$)\b/.test(q)) {
    return "number";
  }
  if (/\b(sim ou nao|sim\/nao|confirma|posso|pode|quer|deseja|autoriza|aceita)\b/.test(q)) {
    return "yes_no";
  }
  if (/\b(opcao|opção|escolha|qual desses|qual delas|qual deles)\b/.test(q)) {
    return "choice";
  }
  return null;
}

function inferSlotNameFromQuestion(question: string, fallback: string): string {
  const q = normalizeForFlowMeaning(question);
  if (/\b(nome|como se chama|quem falo)\b/.test(q)) return "name";
  if (/\b(email|e-mail)\b/.test(q)) return "email";
  if (/\b(telefone|whats|whatsapp|celular|numero|número|contato)\b/.test(q)) return "phone";
  if (/\b(cidade|regiao|região|bairro|localizacao|localização)\b/.test(q)) return "city";
  if (/\b(empresa|negocio|negócio|companhia)\b/.test(q)) return "company";
  if (/\b(interesse|procura|precisa|produto|servico|serviço|plano|solucao|solução)\b/.test(q)) return "interest";
  if (/\b(data|dia|horario|hora|agenda|agendar|marcar|quando|periodo|manha|tarde|noite)\b/.test(q)) return "preferredDate";
  return fallback;
}

function extractContextualTextSlot(question: string, text: string): ClassifierFilledSlot | null {
  const q = normalizeForFlowMeaning(question);
  const raw = String(text || "").trim();
  if (!q || !raw) return null;

  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email && /\b(email|e-mail|contato)\b/.test(q)) {
    return { name: "email", type: "text", value: email, rawText: raw };
  }

  const phone = raw.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/)?.[0];
  if (phone && /\b(telefone|whats|whatsapp|celular|numero|número|contato)\b/.test(q)) {
    return { name: "phone", type: "text", value: phone.replace(/\s+/g, " "), rawText: raw };
  }

  if (/\b(nome|cidade|regiao|região|empresa|interesse|procura|precisa|produto|servico|serviço|plano)\b/.test(q)) {
    const slotName = inferSlotNameFromQuestion(question, "freeText");
    return {
      name: slotName,
      type: "text",
      value: raw.slice(0, 500),
      rawText: raw
    };
  }

  return null;
}

function classifyByActiveQuestion(
  text: string,
  step: CompiledStepIR,
  question: string
): ClassifierResult | null {
  const inferredExpected = inferExpectedReplyFromQuestion(question);
  const slotName = inferSlotNameFromQuestion(question, step.slotName || "freeText");
  if (inferredExpected === "choice" || step.expectedReply === "choice") {
    const branchMatch = matchChoiceBranch(text, step.branchesIR || []);
    if (branchMatch && branchMatch.branch.matcher !== "always") {
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: {
          matcher: branchMatch.branch.matcher,
          label: branchMatch.branch.label,
          nextStepId: branchMatch.branch.nextStepId
        },
        filledSlot: {
          name: step.slotName || slotName || "choice",
          type: "choice",
          value: branchMatch.branch.label || branchMatch.matched,
          rawText: text
        },
        correctionTarget: null,
        confidence: 0.9,
        reasoning: "Resposta interpretada como escolha semântica pela pergunta ativa.",
        source: "fallback"
      };
    }
  }
  if (inferredExpected === "date") {
    const parsed = parseDateTimeFromText(text);
    if (parsed.matched && parsed.date) {
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: { name: slotName, type: "date", value: parsed.date.toISOString(), rawText: text },
        correctionTarget: null,
        confidence: 0.9,
        reasoning: "Resposta interpretada como data/horário pela pergunta ativa.",
        source: "fallback"
      };
    }
    if (bodyLooksLikeDateOrPeriodReply(text)) {
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: { name: slotName, type: "date", value: null, rawText: text },
        correctionTarget: null,
        confidence: 0.72,
        reasoning: "Resposta interpretada como período/data aproximada pela pergunta ativa.",
        source: "fallback"
      };
    }
  }
  if (inferredExpected === "number") {
    const n = parseNumberReply(text);
    if (n != null) {
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: { name: slotName, type: "number", value: n, rawText: text },
        correctionTarget: null,
        confidence: 0.86,
        reasoning: "Número extraído pela pergunta ativa.",
        source: "fallback"
      };
    }
  }
  if (inferredExpected === "yes_no") {
    const yn = parseYesNo(text);
    if (yn) {
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: { name: slotName, type: "yes_no", value: yn, rawText: text },
        correctionTarget: null,
        confidence: 0.86,
        reasoning: "Confirmação interpretada pela pergunta ativa.",
        source: "fallback"
      };
    }
  }

  const textSlot = extractContextualTextSlot(question, text);
  if (textSlot) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "advance",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: textSlot,
      correctionTarget: null,
      confidence: 0.78,
      reasoning: "Resposta livre interpretada pelo contexto da pergunta ativa.",
      source: "fallback"
    };
  }

  return null;
}

/** Pergunta no fim da etapa, mas o cliente fez pergunta dele → off_topic. */
function userAsksOwnQuestion(userText: string, askedQuestion: string | null): boolean {
  if (looksLikeCustomerQuestion(userText)) {
    if (!askedQuestion) return true;
    const aq = askedQuestion.toLowerCase();
    const ut = String(userText || "").toLowerCase();
    /** Se o usuário ecoou a pergunta do agente, NÃO é off-topic — é "não entendi". */
    return !ut.includes(aq.slice(0, 20));
  }
  return false;
}

function applyHeuristic(
  input: ClassifyTurnInput
): ClassifierResult {
  const { userText, currentStep, understanding } = input;
  const step = currentStep;
  const text = String(userText || "").replace(/\u200e/g, "").trim();
  const understandingNode: FlowUnderstandingStepNode | null =
    understanding?.stepMap.find((s) => s.stepId === step.stepId) || null;
  const activeQuestion = activeQuestionForStep(step, understandingNode, input.conversationHistory || []);
  const visibleText = String(step.customerVisibleText || step.agentPrompt || "").trim();
  const inboundScript = classifyScriptInboundTurn(visibleText, text);
  if (inboundScript.deferToLlm) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "off_topic",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: null,
      confidence: 0.82,
      reasoning: inboundScript.reason || "Interrupção humana — delegar à LLM (FAQ/conhecimento).",
      source: "fallback"
    };
  }

  /** Noise. */
  if (!text || isTrivialFlowInboundNoise(text) || isSingleEmojiOnly(text)) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "noise",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: null,
      confidence: 0.95,
      reasoning: "Mensagem vazia ou apenas emoji/cumprimento trivial.",
      source: "fallback"
    };
  }

  /** Repeat. */
  if (REPEAT_PHRASES.test(text)) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "repeat",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: null,
      confidence: 0.8,
      reasoning: "Cliente pediu para repetir/não entendeu.",
      source: "fallback"
    };
  }

  /** Terminate. */
  if (TERMINATE_PHRASES.test(text)) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "terminate",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: null,
      confidence: 0.8,
      reasoning: "Cliente sinalizou encerrar / desistir do fluxo.",
      source: "fallback"
    };
  }

  /** Correction. */
  if (CORRECTION_PHRASES.test(text)) {
    /** Achar etapa-alvo: a última etapa completada antes da atual (heurística simples). */
    const stepsCompleted = Object.keys(input.answersByStep || {})
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => b - a);
    const targetNum = stepsCompleted[0] != null ? stepsCompleted[0] : step.stepNumber;
    const targetId = `s${targetNum}`;
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "correction",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: targetId,
      confidence: 0.75,
      reasoning: `Linguagem de correção detectada; alvo provável: ${targetId}.`,
      source: "fallback"
    };
  }

  const contextualResult = classifyByActiveQuestion(text, step, activeQuestion);
  if (contextualResult) {
    return contextualResult;
  }

  /** Branch matcher: choice / regex / semantic. */
  const branchMatch = matchChoiceBranch(text, step.branchesIR || []);
  if (branchMatch && branchMatch.branch.matcher !== "always") {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "advance",
      targetStepId: step.stepId,
      matchedBranch: {
        matcher: branchMatch.branch.matcher,
        label: branchMatch.branch.label,
        nextStepId: branchMatch.branch.nextStepId
      },
      filledSlot: {
        name: step.slotName || "choice",
        type: "choice",
        value: branchMatch.branch.label || branchMatch.matched,
        rawText: text
      },
      correctionTarget: null,
      confidence: 0.9,
      reasoning: `Resposta casou com branch "${branchMatch.branch.label}" via ${branchMatch.branch.matcher}.`,
      source: "fallback"
    };
  }

  /** Slot inference based on expectedReply. */
  switch (step.expectedReply) {
    case "yes_no": {
      const yn = parseYesNo(text);
      if (yn != null) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "advance",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: {
            name: step.slotName || "yesNo",
            type: "yes_no",
            value: yn,
            rawText: text
          },
          correctionTarget: null,
          confidence: 0.9,
          reasoning: `Resposta interpretada como ${yn}.`,
          source: "fallback"
        };
      }
      break;
    }
    case "number": {
      const n = parseNumberReply(text);
      if (n != null) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "advance",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: {
            name: step.slotName || "number",
            type: "number",
            value: n,
            rawText: text
          },
          correctionTarget: null,
          confidence: 0.9,
          reasoning: `Número extraído: ${n}.`,
          source: "fallback"
        };
      }
      break;
    }
    case "date": {
      const now = input.now || new Date();
      const parsed = parseDateTimeFromText(text);
      if (parsed.matched && parsed.date) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "advance",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: {
            name: step.slotName || "preferredDate",
            type: "date",
            value: parsed.date.toISOString(),
            rawText: text
          },
          correctionTarget: null,
          confidence: 0.9,
          reasoning: "Data/horário identificado no texto.",
          source: "fallback"
        };
      }
      if (bodyLooksLikeDateOrPeriodReply(text)) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "advance",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: {
            name: step.slotName || "preferredDate",
            type: "date",
            value: null,
            rawText: text
          },
          correctionTarget: null,
          confidence: 0.65,
          reasoning: "Texto plausível de período/data (sem parse exato).",
          source: "fallback"
        };
      }
      /** Tem `?` — provavelmente o cliente perguntou de volta. */
      if (userAsksOwnQuestion(text, activeQuestion || null)) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "off_topic",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: null,
          correctionTarget: null,
          confidence: 0.7,
          reasoning: "Cliente fez pergunta nova em vez de responder.",
          source: "fallback"
        };
      }
      if (looksLikePricingOrOffTopicVersusDateQuestion(text)) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "off_topic",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: null,
          correctionTarget: null,
          confidence: 0.72,
          reasoning: "Cliente perguntou sobre preço/valor enquanto a etapa aguardava data ou período.",
          source: "fallback"
        };
      }
      /** Texto que não parece data → off_topic se parecer pergunta; senão advance ambíguo. */
      if (looksLikeCustomerQuestion(text) || looksLikeCustomerInterruption(text)) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "off_topic",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: null,
          correctionTarget: null,
          confidence: 0.72,
          reasoning: "Cliente fez pergunta em vez de informar data/período.",
          source: "fallback"
        };
      }
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: null,
        correctionTarget: null,
        confidence: 0.45,
        reasoning: "Texto não casa com data/período típico. Possível advance ambíguo.",
        source: "fallback"
      };
    }
    case "choice": {
      /** Quando não bateu pelo matchChoiceBranch e expected é choice, baixa confiança. */
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: null,
        correctionTarget: null,
        confidence: 0.5,
        reasoning: "Pergunta com menu, mas a resposta não casou com opção explícita.",
        source: "fallback"
      };
    }
    case "none": {
      /** Etapa automática — qualquer texto é off-topic ou noise. */
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "off_topic",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: null,
        correctionTarget: null,
        confidence: 0.7,
        reasoning: "Etapa não espera resposta (executa ação automática).",
        source: "fallback"
      };
    }
    case "text":
    case "open":
    default: {
      /** Off-topic ou advance baixa confiança. */
      if (userAsksOwnQuestion(text, activeQuestion || null)) {
        return {
          schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
          intent: "off_topic",
          targetStepId: step.stepId,
          matchedBranch: null,
          filledSlot: null,
          correctionTarget: null,
          confidence: 0.7,
          reasoning: "Cliente fez nova pergunta antes de responder.",
          source: "fallback"
        };
      }
      return {
        schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
        intent: "advance",
        targetStepId: step.stepId,
        matchedBranch: null,
        filledSlot: {
          name: step.slotName || "freeText",
          type: step.expectedReply === "open" ? "open" : "text",
          value: text.slice(0, 500),
          rawText: text
        },
        correctionTarget: null,
        confidence: 0.6,
        reasoning: "Resposta livre — avança com slot de texto.",
        source: "fallback"
      };
    }
  }

  /** Fallback final genérico (ex.: yes_no que não bateu). */
  if (looksLikeCustomerQuestion(text) || looksLikeCustomerInterruption(text)) {
    return {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: "off_topic",
      targetStepId: step.stepId,
      matchedBranch: null,
      filledSlot: null,
      correctionTarget: null,
      confidence: 0.68,
      reasoning: "Mensagem parece pergunta do cliente — não avançar etapa canned.",
      source: "fallback"
    };
  }
  return {
    schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
    intent: "advance",
    targetStepId: step.stepId,
    matchedBranch: null,
    filledSlot: null,
    correctionTarget: null,
    confidence: 0.4,
    reasoning: "Sem sinal forte; advance de baixa confiança.",
    source: "fallback"
  };
}

/* -------------------------------------------------------------------------- */
/*                                    LLM                                     */
/* -------------------------------------------------------------------------- */

const ALLOWED_INTENT = new Set([
  "advance",
  "correction",
  "repeat",
  "off_topic",
  "noise",
  "terminate"
]);

function validateLlmClassifierJson(
  raw: unknown,
  validStepIds: Set<string>
): { ok: true; value: ClassifierResult } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "Resposta não é um objeto." };
  }
  const obj = raw as Record<string, unknown>;
  const intentStr = String(obj.intent || "").toLowerCase();
  if (!ALLOWED_INTENT.has(intentStr)) {
    return { ok: false, reason: `intent inválido: ${intentStr}` };
  }
  const targetStepId = obj.targetStepId != null ? String(obj.targetStepId) : null;
  if (targetStepId && targetStepId !== "end" && !validStepIds.has(targetStepId)) {
    return { ok: false, reason: `targetStepId desconhecido: ${targetStepId}` };
  }
  const correctionTarget = obj.correctionTarget != null ? String(obj.correctionTarget) : null;
  if (correctionTarget && !validStepIds.has(correctionTarget)) {
    return { ok: false, reason: `correctionTarget desconhecido: ${correctionTarget}` };
  }
  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  let matchedBranch: ClassifierMatchedBranch | null = null;
  if (obj.matchedBranch && typeof obj.matchedBranch === "object" && !Array.isArray(obj.matchedBranch)) {
    const mb = obj.matchedBranch as Record<string, unknown>;
    const matcherStr = String(mb.matcher || "");
    if (["choice", "regex", "semantic", "always"].includes(matcherStr)) {
      matchedBranch = {
        matcher: matcherStr as StepBranchIR["matcher"],
        label: String(mb.label || "").slice(0, 200),
        nextStepId: mb.nextStepId != null ? String(mb.nextStepId) : null
      };
    }
  }

  let filledSlot: ClassifierFilledSlot | null = null;
  if (obj.filledSlot && typeof obj.filledSlot === "object" && !Array.isArray(obj.filledSlot)) {
    const fs = obj.filledSlot as Record<string, unknown>;
    const name = String(fs.name || "").slice(0, 128);
    const typeStr = String(fs.type || "");
    const allowedTypes: ExpectedReplyKind[] = [
      "text",
      "choice",
      "date",
      "number",
      "yes_no",
      "open",
      "none"
    ];
    if (name && allowedTypes.includes(typeStr as ExpectedReplyKind)) {
      let value: string | number | null = null;
      if (typeof fs.value === "number" && Number.isFinite(fs.value)) value = fs.value;
      else if (typeof fs.value === "string") value = fs.value.slice(0, 500);
      else if (fs.value === null) value = null;
      filledSlot = {
        name,
        type: typeStr as ExpectedReplyKind,
        value,
        rawText: String(fs.rawText || "").slice(0, 500)
      };
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: FLOW_CLASSIFIER_SCHEMA_VERSION,
      intent: intentStr as ClassifierIntent,
      targetStepId,
      matchedBranch,
      filledSlot,
      correctionTarget,
      confidence,
      reasoning: String(obj.reasoning || "").slice(0, 600),
      source: "llm",
      shouldRespondNow: obj.shouldRespondNow !== false,
      missingInfo: Array.isArray(obj.missingInfo)
        ? obj.missingInfo.map((x) => String(x).slice(0, 80)).filter(Boolean).slice(0, 8)
        : [],
      nextNaturalQuestion:
        obj.nextNaturalQuestion != null
          ? String(obj.nextNaturalQuestion).slice(0, 300)
          : null,
      mustNotConsumeSilently: obj.mustNotConsumeSilently !== false
    }
  };
}

function buildLlmSystemPrompt(): string {
  return [
    "Você é um classificador de turno de conversação em PT-BR.",
    "Dado o passo atual de um fluxo de atendimento + a mensagem do cliente + o histórico curto,",
    "decida QUE intenção a mensagem tem em relação ao fluxo.",
    "",
    "Saída: JSON puro (sem markdown, sem cercas) EXATAMENTE neste shape:",
    "{",
    '  "intent": "advance" | "correction" | "repeat" | "off_topic" | "noise" | "terminate",',
    '  "targetStepId": string | null,        // a etapa a que essa mensagem se refere (geralmente a ativa)',
    '  "matchedBranch": { "matcher": "choice"|"regex"|"semantic"|"always", "label": string, "nextStepId": string | null } | null,',
    '  "filledSlot": { "name": string, "type": "text"|"choice"|"date"|"number"|"yes_no"|"open"|"none", "value": string|number|null, "rawText": string } | null,',
    '  "correctionTarget": string | null,    // stepId a corrigir, quando intent="correction"',
    '  "shouldRespondNow": boolean,',
    '  "missingInfo": string[],',
    '  "nextNaturalQuestion": string | null,',
    '  "mustNotConsumeSilently": boolean,',
    '  "confidence": 0..1,',
    '  "reasoning": string                   // 1 frase explicando',
    "}",
    "",
    "Regras:",
    "- Use somente stepIds que aparecem no input.",
    '- "noise" para cumprimento curto, "ok", emojis isolados.',
    '- "repeat" quando o cliente pede repetição ou diz que não entendeu.',
    '- "correction" quando o cliente sinaliza erro em resposta anterior ("ah, errado, é dia 21").',
    '- "off_topic" quando o cliente faz pergunta nova / fala de outro assunto antes de responder.',
    '- "terminate" quando o cliente desiste explicitamente.',
    '- "advance" para o caso normal — preencha `filledSlot` quando a resposta extrair um valor.',
    "- Quando a etapa tiver opções em linguagem natural (ex.: A, B ou C), aceite sinônimos e respostas parciais como escolha válida.",
    "- Se a mensagem responde só uma das perguntas feitas, marque advance para o dado respondido e liste o restante em missingInfo.",
    "- mustNotConsumeSilently deve ser true para qualquer mensagem substantiva do cliente.",
    "- Para datas, devolva `value` como string ISO 8601; números como number.",
    "- NÃO escreva markdown. NÃO inclua chaves além das listadas."
  ].join("\n");
}

function buildLlmUserPrompt(input: ClassifyTurnInput): string {
  const step = input.currentStep;
  const node = input.understanding?.stepMap.find((s) => s.stepId === step.stepId) || null;
  const history = (input.conversationHistory || []).slice(-6);
  return [
    "Etapa ativa:",
    JSON.stringify(
      {
        stepId: step.stepId,
        stepNumber: step.stepNumber,
        title: step.title,
        expectedReply: step.expectedReply,
        slotName: step.slotName,
        customerVisibleText: step.customerVisibleText,
        branchesIR: step.branchesIR,
        askedQuestion: node?.askedQuestion ?? null,
        typicalReplies: node?.typicalReplies ?? []
      },
      null,
      2
    ),
    "",
    "Etapas válidas (stepIds que você pode referenciar):",
    JSON.stringify(
      (input.understanding?.stepMap || []).map((s) => ({ stepId: s.stepId, stepNumber: s.stepNumber, title: s.title })),
      null,
      2
    ),
    "",
    "Histórico curto (mais antigo primeiro):",
    history.length
      ? history.map((h) => `[${h.role}] ${h.text}`).join("\n")
      : "(vazio)",
    "",
    "Mensagem do cliente nesta vez:",
    JSON.stringify(input.userText),
    "",
    "Retorne apenas o JSON da classificação."
  ].join("\n");
}

async function callLlmClassifier(
  input: ClassifyTurnInput,
  validStepIds: Set<string>
): Promise<{ result: ClassifierResult | null; error?: string }> {
  const apiKey = String(input.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return { result: null, error: "openai_api_key_missing" };
  const model = input.model || process.env.ATTENDANCE_FLOW_CLASSIFIER_MODEL || OPENAI_DEFAULT_FAST_MODEL;
  const timeoutMs = Number(input.llmTimeoutMs || 12_000);

  const client = input.openaiClient ?? new OpenAI({ apiKey });
  let rawJson: string;
  try {
    const completionPromise = client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: buildLlmSystemPrompt() },
        { role: "user", content: buildLlmUserPrompt(input) }
      ],
      temperature: 0,
      max_tokens: 600,
      response_format: { type: "json_object" }
    });
    const completion = await Promise.race([
      completionPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("llm_timeout")), timeoutMs)
      )
    ]);
    rawJson = String(completion?.choices?.[0]?.message?.content || "").trim();
  } catch (e: any) {
    return { result: null, error: `llm_call_failed:${e?.message || "unknown"}` };
  }
  if (!rawJson) return { result: null, error: "llm_empty_response" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { result: null, error: "llm_response_not_json" };
  }
  const validation = validateLlmClassifierJson(parsed, validStepIds);
  if (validation.ok === false) {
    return { result: null, error: `validation_failed:${validation.reason}` };
  }
  return { result: validation.value };
}

/* -------------------------------------------------------------------------- */
/*                              Modo / Orquestrador                           */
/* -------------------------------------------------------------------------- */

export function resolveClassifierMode(
  override?: ClassifyTurnInput["mode"]
): "heuristic" | "auto" | "llm" {
  if (override) return override;
  const env = String(process.env.ATTENDANCE_FLOW_CLASSIFIER_MODE || "").toLowerCase();
  if (env === "heuristic" || env === "auto" || env === "llm") return env;
  return "heuristic";
}

export async function classifyAttendanceFlowTurn(
  input: ClassifyTurnInput
): Promise<ClassifierResult> {
  const mode = resolveClassifierMode(input.mode);
  const cacheKey = hashClassifyInput(input);
  if (!input.disableCache) {
    const cached = cacheGet(cacheKey);
    if (cached) return cached;
  }

  /** Sempre roda heurística — barata e provê fallback garantido. */
  const heuristicResult = applyHeuristic(input);

  const validStepIds = new Set<string>([
    input.currentStep.stepId,
    ...(input.understanding?.stepMap.map((s) => s.stepId) || [])
  ]);

  let finalResult: ClassifierResult = heuristicResult;
  const threshold = input.llmFallbackThreshold ?? 0.7;

  if (mode === "llm" || (mode === "auto" && heuristicResult.confidence < threshold)) {
    const llm = await callLlmClassifier(input, validStepIds);
    if (llm.result) {
      finalResult =
        mode === "auto" && heuristicResult.confidence >= threshold
          ? { ...llm.result, source: "hybrid" }
          : llm.result;
      try {
        logger.info(
          JSON.stringify({
            evt: "attendance_flow_classifier_llm",
            intent: finalResult.intent,
            stepId: input.currentStep.stepId,
            confidence: finalResult.confidence
          })
        );
      } catch {
        /* ignore log */
      }
    } else if (mode === "llm") {
      throw new Error(`Classifier LLM falhou (modo=llm): ${llm.error}`);
    } else {
      try {
        logger.info(
          JSON.stringify({
            evt: "attendance_flow_classifier_llm_fallback",
            reason: llm.error,
            stepId: input.currentStep.stepId
          })
        );
      } catch {
        /* ignore */
      }
    }
  }

  if (!input.disableCache) cacheSet(cacheKey, finalResult);
  return finalResult;
}

/** Reexports para testes / consumidores externos. */
export { applyHeuristic, validateLlmClassifierJson };
