/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowUnderstandingService (PR 3 — fluxo agente IA senior revamp).
 *
 * Pré-compreensão do fluxo no SAVE. Antes de qualquer conversa, o sistema
 * gera um JSON estruturado descrevendo o objetivo global, mapa de etapas,
 * slots esperados, transições, gatilhos e riscos. Esse JSON é cacheado em
 * `AttendanceFlowDefinition.flowUnderstanding` e injetado RESUMIDO no system
 * prompt em runtime — sem custo recorrente.
 *
 * Modos:
 *  - `auto`     : tenta LLM; se faltar key/erro, usa fallback determinístico.
 *  - `llm`      : força LLM (lança se faltar configuração).
 *  - `fallback` : pula LLM e gera direto do IR (default em dev/CI).
 *
 * Feature flag: `ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED=true` ativa modo `auto`.
 *
 * Output sempre passa por validação contra `validateFlowUnderstanding` — JSON
 * malformado da LLM nunca chega ao banco; o fallback assume.
 */

import OpenAI from "openai";
import logger from "../../utils/logger";
import { OPENAI_DEFAULT_CHAT_MODEL } from "../../config/openAiDefaults";
import {
  computeAttendanceFlowIrHash,
  type IrHashInput
} from "../../helpers/computeAttendanceFlowIrHash";
import type {
  CompiledStepIR,
  CompiledFlowDefinitionDraft,
  ExpectedReplyKind
} from "../../helpers/compileAttendanceFlowIR";

/** Versão do schema do flowUnderstanding — incrementa quando mudamos shape. */
export const FLOW_UNDERSTANDING_SCHEMA_VERSION = 1;

export type FlowUnderstandingStepNode = {
  stepId: string;
  stepNumber: number;
  title: string;
  objective: string;
  /** Slot esperado nessa etapa (ex.: preferredDate). */
  expectedSlot: string | null;
  /** Pergunta principal feita pelo agente (1 linha curta). */
  askedQuestion: string | null;
  /** Como saber que a etapa foi cumprida. */
  successCriteria: string;
  /** Exemplos de respostas válidas (3-5). */
  typicalReplies: string[];
  /** Branches semânticos: para onde ir conforme intenção. */
  forwardLeads: Array<{ to: string; on: string }>;
};

export type FlowUnderstandingSlot = {
  slotName: string;
  /** date | number | text | choice | yes_no */
  type: ExpectedReplyKind;
  /** Em quais etapas é coletado. */
  askedAt: string[];
  /** Etapa que depende dele para concluir (ex.: agendamento). */
  requiredBy: string | null;
};

export type FlowUnderstandingTransition = {
  from: string;
  to: string;
  smartActionSlug: string | null;
  when: "on_present" | "after_reply" | "on_enter" | "on_exit" | "on_transition" | "on_correction" | "on_flow_complete";
};

export type FlowUnderstandingRisk = {
  severity: "info" | "warn" | "error";
  stepId: string | null;
  code: string;
  message: string;
};

export type FlowUnderstanding = {
  schemaVersion: number;
  source: "llm" | "fallback" | "hybrid";
  generatedAt: string;
  irHash: string;
  globalObjective: string;
  audience: string;
  stepMap: FlowUnderstandingStepNode[];
  slotsExpected: FlowUnderstandingSlot[];
  transitionTriggers: FlowUnderstandingTransition[];
  terminalStates: string[];
  risksDetected: FlowUnderstandingRisk[];
  /** Confiança auto-reportada da pré-compreensão (0..1). */
  confidence: number;
};

/** Resumo curto para injeção no system prompt em runtime (entrega 7). */
export type FlowUnderstandingDigest = {
  globalObjective: string;
  audience: string;
  totalSteps: number;
  terminalStates: string[];
  slotsExpected: Array<{ slotName: string; type: string }>;
  risksSummary: string[];
};

export type GenerateUnderstandingInput = {
  steps: CompiledStepIR[];
  definition: CompiledFlowDefinitionDraft;
  /** API key do prompt (mesma do agente). */
  apiKey?: string | null;
  /** Modelo OpenAI (default: OPENAI_DEFAULT_CHAT_MODEL). */
  model?: string;
  /** Modo explícito; default lê env. */
  mode?: "auto" | "llm" | "fallback";
  /** Timeout em ms para o call LLM (default 25s). */
  llmTimeoutMs?: number;
  /** Permite testes injetarem um client OpenAI fake. */
  openaiClient?: any;
  /** IrHash já calculado (otimização). */
  irHash?: string;
};

export type GenerateUnderstandingResult = {
  understanding: FlowUnderstanding;
  warnings: string[];
};

/* -------------------------------------------------------------------------- */
/*                                Validação                                   */
/* -------------------------------------------------------------------------- */

const ALLOWED_EXPECTED: ExpectedReplyKind[] = [
  "text",
  "choice",
  "date",
  "number",
  "yes_no",
  "open",
  "none"
];
const ALLOWED_SEVERITY = new Set(["info", "warn", "error"]);
const ALLOWED_WHEN = new Set([
  "on_present",
  "after_reply",
  "on_enter",
  "on_exit",
  "on_transition",
  "on_correction",
  "on_flow_complete"
]);

function asString(v: unknown, max = 2000): string {
  if (v == null) return "";
  return String(v).slice(0, max);
}

function asStringArray(v: unknown, maxItems = 20, maxLen = 400): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => asString(x, maxLen))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

function validateFlowUnderstanding(
  raw: unknown,
  stepIds: Set<string>
): { ok: true; value: FlowUnderstanding } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "FlowUnderstanding não é um objeto." };
  }
  const obj = raw as Record<string, unknown>;
  const stepMapRaw = Array.isArray(obj.stepMap) ? obj.stepMap : [];

  const stepMap: FlowUnderstandingStepNode[] = stepMapRaw
    .map((s) => {
      if (!s || typeof s !== "object" || Array.isArray(s)) return null;
      const r = s as Record<string, unknown>;
      const stepId = asString(r.stepId, 64);
      const stepNumberN = Number(r.stepNumber);
      if (!stepId || !Number.isFinite(stepNumberN)) return null;
      return {
        stepId,
        stepNumber: Math.trunc(stepNumberN),
        title: asString(r.title, 240) || `Etapa ${stepNumberN}`,
        objective: asString(r.objective, 600),
        expectedSlot: r.expectedSlot != null ? asString(r.expectedSlot, 128) || null : null,
        askedQuestion: r.askedQuestion != null ? asString(r.askedQuestion, 400) || null : null,
        successCriteria: asString(r.successCriteria, 400),
        typicalReplies: asStringArray(r.typicalReplies, 8, 240),
        forwardLeads: Array.isArray(r.forwardLeads)
          ? (r.forwardLeads as unknown[])
              .map((b) => {
                if (!b || typeof b !== "object" || Array.isArray(b)) return null;
                const br = b as Record<string, unknown>;
                const to = asString(br.to, 64);
                const on = asString(br.on, 240);
                if (!to || !on) return null;
                return { to, on };
              })
              .filter(Boolean) as Array<{ to: string; on: string }>
          : []
      };
    })
    .filter(Boolean) as FlowUnderstandingStepNode[];

  if (!stepMap.length) {
    return { ok: false, reason: "FlowUnderstanding.stepMap vazio." };
  }

  /** Slots */
  const slotsExpected: FlowUnderstandingSlot[] = (Array.isArray(obj.slotsExpected)
    ? obj.slotsExpected
    : []
  )
    .map((sl) => {
      if (!sl || typeof sl !== "object" || Array.isArray(sl)) return null;
      const r = sl as Record<string, unknown>;
      const slotName = asString(r.slotName, 128);
      if (!slotName) return null;
      const typeRaw = asString(r.type, 32) as ExpectedReplyKind;
      const type: ExpectedReplyKind = (ALLOWED_EXPECTED.includes(typeRaw) ? typeRaw : "text") as ExpectedReplyKind;
      return {
        slotName,
        type,
        askedAt: asStringArray(r.askedAt, 20, 64),
        requiredBy: r.requiredBy != null ? asString(r.requiredBy, 64) || null : null
      };
    })
    .filter(Boolean) as FlowUnderstandingSlot[];

  /** Transition triggers */
  const transitionTriggers: FlowUnderstandingTransition[] = (Array.isArray(obj.transitionTriggers)
    ? obj.transitionTriggers
    : []
  )
    .map((t) => {
      if (!t || typeof t !== "object" || Array.isArray(t)) return null;
      const r = t as Record<string, unknown>;
      const from = asString(r.from, 64);
      const to = asString(r.to, 64);
      if (!from || !to) return null;
      const whenStr = asString(r.when, 64);
      if (!ALLOWED_WHEN.has(whenStr)) return null;
      return {
        from,
        to,
        smartActionSlug: r.smartActionSlug != null ? asString(r.smartActionSlug, 128) || null : null,
        when: whenStr as FlowUnderstandingTransition["when"]
      };
    })
    .filter(Boolean) as FlowUnderstandingTransition[];

  const terminalStates = asStringArray(obj.terminalStates, 16, 64);

  const risksDetected: FlowUnderstandingRisk[] = (Array.isArray(obj.risksDetected)
    ? obj.risksDetected
    : []
  )
    .map((r) => {
      if (!r || typeof r !== "object" || Array.isArray(r)) return null;
      const rr = r as Record<string, unknown>;
      const severityRaw = asString(rr.severity, 16);
      const severity = (ALLOWED_SEVERITY.has(severityRaw)
        ? severityRaw
        : "warn") as FlowUnderstandingRisk["severity"];
      const code = asString(rr.code, 64) || "generic";
      const message = asString(rr.message, 600);
      if (!message) return null;
      return {
        severity,
        stepId: rr.stepId != null ? asString(rr.stepId, 64) || null : null,
        code,
        message
      };
    })
    .filter(Boolean) as FlowUnderstandingRisk[];

  /** Confiança normalizada em [0,1]. */
  let confidence = Number(obj.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  if (confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  /** Source preferido: confiamos no que veio; sanitizamos. */
  const sourceRaw = asString(obj.source, 16);
  const source: FlowUnderstanding["source"] =
    sourceRaw === "llm" || sourceRaw === "fallback" || sourceRaw === "hybrid" ? sourceRaw : "llm";

  /** Cross-check: terminalStates e transitions devem usar IDs que existem (`end` é permitido). */
  for (const id of terminalStates) {
    if (id !== "end" && !stepIds.has(id)) {
      return { ok: false, reason: `terminalStates inclui stepId desconhecido "${id}".` };
    }
  }
  for (const t of transitionTriggers) {
    if (t.from !== "*" && t.from !== "start" && !stepIds.has(t.from)) {
      return { ok: false, reason: `transition.from desconhecido "${t.from}".` };
    }
    if (t.to !== "*" && t.to !== "end" && !stepIds.has(t.to)) {
      return { ok: false, reason: `transition.to desconhecido "${t.to}".` };
    }
  }

  return {
    ok: true,
    value: {
      schemaVersion: FLOW_UNDERSTANDING_SCHEMA_VERSION,
      source,
      generatedAt: new Date().toISOString(),
      irHash: "",
      globalObjective: asString(obj.globalObjective, 800),
      audience: asString(obj.audience, 400),
      stepMap,
      slotsExpected,
      transitionTriggers,
      terminalStates,
      risksDetected,
      confidence
    }
  };
}

/* -------------------------------------------------------------------------- */
/*                       Fallback determinístico do IR                        */
/* -------------------------------------------------------------------------- */

function lastQuestionLine(visible: string): string | null {
  const lines = String(visible || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/\?\s*$/.test(lines[i])) return lines[i];
  }
  return null;
}

function deriveTypicalReplies(s: CompiledStepIR): string[] {
  const out: string[] = [];
  for (const ex of s.trainingMarkers?.examples || []) {
    const e = String(ex || "").trim();
    if (!e) continue;
    out.push(e.slice(0, 200));
  }
  /** Branches semânticos viram exemplos também. */
  for (const b of s.branchesIR || []) {
    if (b.matcher === "semantic" && b.label) out.push(b.label.slice(0, 200));
  }
  return [...new Set(out)].slice(0, 8);
}

function deriveSuccessCriteria(s: CompiledStepIR): string {
  switch (s.expectedReply) {
    case "date":
      return "Cliente respondeu uma data, dia, horário ou período válido.";
    case "number":
      return "Cliente respondeu um número (quantidade, valor, etc.).";
    case "yes_no":
      return 'Cliente respondeu "sim" ou "não".';
    case "choice":
      return "Cliente escolheu uma das opções apresentadas no menu.";
    case "text":
      return "Cliente respondeu com texto livre relacionado à pergunta.";
    case "none":
      return "Etapa executa ações automáticas (sem espera de resposta do cliente).";
    case "open":
    default:
      return "Cliente respondeu algo plausível; agente pode avançar.";
  }
}

export function buildDeterministicFallback(
  steps: CompiledStepIR[],
  definition: CompiledFlowDefinitionDraft,
  irHash: string
): FlowUnderstanding {
  const stepIds = new Set(steps.map((s) => s.stepId));
  const stepMap: FlowUnderstandingStepNode[] = steps.map((s) => ({
    stepId: s.stepId,
    stepNumber: s.stepNumber,
    title: s.title,
    objective: s.objective,
    expectedSlot: s.slotName || null,
    askedQuestion: lastQuestionLine(s.customerVisibleText || s.agentPrompt) || null,
    successCriteria: deriveSuccessCriteria(s),
    typicalReplies: deriveTypicalReplies(s),
    forwardLeads: (s.branchesIR || [])
      .filter((b) => b.nextStepId)
      .map((b) => ({
        to: b.nextStepId === "end" ? "end" : (b.nextStepId as string),
        on: b.label || (b.matcher === "always" ? "fluxo linear" : b.matcher)
      }))
  }));

  /** Slots: agrupa por slotName, infere askedAt e requiredBy. */
  const slotMap = new Map<string, FlowUnderstandingSlot>();
  for (const s of steps) {
    if (!s.slotName) continue;
    const existing = slotMap.get(s.slotName);
    if (existing) {
      existing.askedAt.push(s.stepId);
    } else {
      slotMap.set(s.slotName, {
        slotName: s.slotName,
        type: s.expectedReply,
        askedAt: [s.stepId],
        requiredBy:
          s.commandsIR?.find((c) => c.kind === "agendamento" || c.kind === "agendar")?.slug
            ? s.stepId
            : null
      });
    }
  }
  const slotsExpected = [...slotMap.values()];

  /** Transition triggers: combina commandsIR com transitionHooks da Definition. */
  const transitionTriggers: FlowUnderstandingTransition[] = [];
  for (const s of steps) {
    for (const c of s.commandsIR || []) {
      transitionTriggers.push({
        from: s.stepId,
        to: s.stepId,
        smartActionSlug: c.slug || null,
        when: c.when
      });
    }
  }
  if (Array.isArray(definition.transitionHooks)) {
    for (const h of definition.transitionHooks as Array<{
      from?: string;
      to?: string;
      action?: { slug?: string };
      condition?: string;
    }>) {
      if (!h) continue;
      transitionTriggers.push({
        from: String(h.from || "*"),
        to: String(h.to || "*"),
        smartActionSlug: h.action?.slug || null,
        when: h.condition === "on_correction" ? "on_correction" : "on_transition"
      });
    }
  }

  /** Terminais: última etapa SEM forwardLeads OU branches que apontam para 'end'. */
  const terminalStates: string[] = [];
  for (const s of stepMap) {
    if (!s.forwardLeads.length) terminalStates.push(s.stepId);
    for (const fl of s.forwardLeads) {
      if (fl.to === "end" && !terminalStates.includes(s.stepId)) terminalStates.push(s.stepId);
    }
  }
  if (!terminalStates.length && steps.length > 0) {
    /** Sempre tem que ter um terminal — pega o último. */
    terminalStates.push(steps[steps.length - 1].stepId);
  }

  /** Riscos derivados do compilador. */
  const risksDetected: FlowUnderstandingRisk[] = [];
  for (const s of steps) {
    if (s.expectedReply === "open" && (s.customerVisibleText || "").includes("?")) {
      risksDetected.push({
        severity: "warn",
        stepId: s.stepId,
        code: "ambiguous_question",
        message: `Etapa ${s.stepNumber} faz pergunta aberta sem tipo de resposta inferido — o motor pode ficar ambíguo.`
      });
    }
    if (
      (s.commandsIR || []).some((c) => c.smartActionId == null && c.kind !== "media")
    ) {
      const slugs = (s.commandsIR || [])
        .filter((c) => c.smartActionId == null && c.kind !== "media")
        .map((c) => `/${c.slug}`)
        .join(", ");
      risksDetected.push({
        severity: "warn",
        stepId: s.stepId,
        code: "missing_smart_action",
        message: `Etapa ${s.stepNumber} usa comando(s) ${slugs} sem ação inteligente correspondente cadastrada.`
      });
    }
  }
  if (!steps.some((s) => s.expectedReply !== "none" && s.expectedReply !== "open")) {
    risksDetected.push({
      severity: "info",
      stepId: null,
      code: "no_strong_signals",
      message:
        "Nenhuma etapa tem sinal forte de tipo de resposta (data, número, escolha, sim/não). A classificação pode ser menos determinística."
    });
  }

  /** Objetivo + audiência: inferência leve. */
  const allText = steps
    .map((s) => s.customerVisibleText || s.agentPrompt || "")
    .join(" ")
    .toLowerCase();
  let globalObjective = "Conduzir um atendimento estruturado seguindo o roteiro configurado.";
  if (/agend|reserv|hosped|viaj/i.test(allText)) {
    globalObjective = "Coletar informações do cliente e agendar/reservar o atendimento solicitado.";
  } else if (/transfer/i.test(allText)) {
    globalObjective = "Qualificar o cliente e transferir o atendimento para o time humano adequado.";
  } else if (/cota[cç][aã]o|or[cç]amento|valor|preco|preço/i.test(allText)) {
    globalObjective = "Apresentar valores, esclarecer dúvidas e encaminhar a próxima etapa comercial.";
  }
  const audience = "Cliente do canal WhatsApp interagindo com o agente IA da empresa.";

  return {
    schemaVersion: FLOW_UNDERSTANDING_SCHEMA_VERSION,
    source: "fallback",
    generatedAt: new Date().toISOString(),
    irHash,
    globalObjective,
    audience,
    stepMap,
    slotsExpected,
    transitionTriggers,
    terminalStates,
    risksDetected,
    confidence: 0.6
  };
}

/* -------------------------------------------------------------------------- */
/*                            Geração via LLM                                 */
/* -------------------------------------------------------------------------- */

function buildLlmSystemPrompt(): string {
  return [
    "Você é um analista de fluxo conversacional. Receberá o roteiro de um agente de WhatsApp já compilado em IR (intermediate representation).",
    "Sua tarefa: produzir uma PRÉ-COMPREENSÃO ESTRUTURADA do fluxo, em JSON puro (sem markdown, sem comentário), seguindo EXATAMENTE o schema abaixo.",
    "",
    "Schema (TypeScript-like):",
    "{",
    '  "globalObjective": string,                       // 1-2 linhas: o que esse fluxo tenta alcançar',
    '  "audience": string,                              // quem é o cliente típico',
    '  "stepMap": [{                                    // uma entrada por etapa, ORDENADA por stepNumber',
    '    "stepId": string,                              // EXATAMENTE como veio no IR',
    '    "stepNumber": number,',
    '    "title": string,                               // título humano curto',
    '    "objective": string,                           // o que essa etapa precisa conseguir',
    '    "expectedSlot": string | null,                 // slotName quando aplicável (preferredDate, groupSize, budget…)',
    '    "askedQuestion": string | null,                // a pergunta principal feita ao cliente',
    '    "successCriteria": string,                     // como saber que a etapa foi cumprida',
    '    "typicalReplies": string[],                    // 3-5 exemplos plausíveis de resposta do cliente',
    '    "forwardLeads": [{ "to": string, "on": string }] // para onde ir conforme intenção; "to" pode ser stepId ou "end"',
    "  }],",
    '  "slotsExpected": [{ "slotName": string, "type": "date"|"number"|"text"|"choice"|"yes_no"|"open"|"none", "askedAt": string[], "requiredBy": string | null }],',
    '  "transitionTriggers": [{ "from": string, "to": string, "smartActionSlug": string | null, "when": "on_present"|"after_reply"|"on_enter"|"on_exit"|"on_transition"|"on_correction"|"on_flow_complete" }],',
    '  "terminalStates": string[],                      // stepIds que encerram o fluxo (ou ["end"])',
    '  "risksDetected": [{ "severity": "info"|"warn"|"error", "stepId": string|null, "code": string, "message": string }],',
    '  "confidence": number                             // 0..1, sua confiança nessa pré-compreensão',
    "}",
    "",
    "REGRAS DURAS:",
    "1. Não invente stepIds — use exatamente os do IR.",
    "2. typicalReplies devem ser plausíveis para a pergunta da etapa (em PT-BR).",
    "3. Não inclua chaves além das do schema.",
    "4. NÃO escreva markdown, blockquotes, fence, prefixos. Responda apenas com o JSON.",
    "5. Liste em risksDetected qualquer ambiguidade, gap de slot ou comando órfão."
  ].join("\n");
}

function buildLlmUserPrompt(steps: CompiledStepIR[], definition: CompiledFlowDefinitionDraft): string {
  const irPayload = {
    entryStepId: definition.entryStepId,
    fallbackStepId: definition.fallbackStepId,
    policy: definition.policy,
    transitionHooks: definition.transitionHooks || [],
    steps: steps.map((s) => ({
      stepId: s.stepId,
      stepNumber: s.stepNumber,
      title: s.title,
      objective: s.objective,
      expectedReply: s.expectedReply,
      slotName: s.slotName,
      slotSchema: s.slotSchema,
      customerVisibleText: s.customerVisibleText,
      branchesIR: s.branchesIR,
      commandsIR: s.commandsIR,
      trainingMarkers: s.trainingMarkers
    }))
  };
  return [
    "IR do fluxo (compilado):",
    "```json",
    JSON.stringify(irPayload, null, 2),
    "```",
    "",
    "Produza o JSON da pré-compreensão seguindo o schema do system."
  ].join("\n");
}

async function callLlmForUnderstanding(
  input: GenerateUnderstandingInput,
  stepIds: Set<string>,
  irHash: string
): Promise<{ understanding: FlowUnderstanding | null; rawJson: string | null; error?: string }> {
  const apiKey = String(input.apiKey || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return { understanding: null, rawJson: null, error: "openai_api_key_missing" };
  }
  const model = input.model || process.env.ATTENDANCE_FLOW_UNDERSTANDING_MODEL || OPENAI_DEFAULT_CHAT_MODEL;
  const timeoutMs = Number(input.llmTimeoutMs || 25_000);

  const client = input.openaiClient ?? new OpenAI({ apiKey });
  const system = buildLlmSystemPrompt();
  const user = buildLlmUserPrompt(input.steps, input.definition);

  let rawJson: string | null = null;
  try {
    const completionPromise = client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0,
      max_tokens: 4000,
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
    return {
      understanding: null,
      rawJson: null,
      error: `llm_call_failed:${e?.message || "unknown"}`
    };
  }

  if (!rawJson) {
    return { understanding: null, rawJson: null, error: "llm_empty_response" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      understanding: null,
      rawJson,
      error: "llm_response_not_json"
    };
  }

  const validation = validateFlowUnderstanding(parsed, stepIds);
  if (validation.ok === false) {
    return {
      understanding: null,
      rawJson,
      error: `validation_failed:${validation.reason}`
    };
  }
  const understanding: FlowUnderstanding = { ...validation.value, source: "llm", irHash };
  return { understanding, rawJson };
}

/* -------------------------------------------------------------------------- */
/*                                 Orquestrador                               */
/* -------------------------------------------------------------------------- */

export function resolveUnderstandingMode(
  override?: GenerateUnderstandingInput["mode"]
): "auto" | "llm" | "fallback" {
  if (override) return override;
  const env = String(process.env.ATTENDANCE_FLOW_UNDERSTANDING_MODE || "").toLowerCase();
  if (env === "llm" || env === "fallback") return env;
  const flag = String(process.env.ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED || "").toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return "auto";
  return "fallback";
}

export async function generateAttendanceFlowUnderstanding(
  input: GenerateUnderstandingInput
): Promise<GenerateUnderstandingResult> {
  const warnings: string[] = [];
  const mode = resolveUnderstandingMode(input.mode);
  const irHash =
    input.irHash ||
    computeAttendanceFlowIrHash({
      compilerVersion: input.definition.compilerVersion,
      entryStepId: input.definition.entryStepId,
      fallbackStepId: input.definition.fallbackStepId,
      policy: input.definition.policy,
      transitionHooks: input.definition.transitionHooks,
      steps: input.steps as IrHashInput["steps"]
    });
  const stepIds = new Set(input.steps.map((s) => s.stepId));

  if (mode === "fallback") {
    return {
      understanding: buildDeterministicFallback(input.steps, input.definition, irHash),
      warnings
    };
  }

  /** Modo `llm` ou `auto`. */
  const llm = await callLlmForUnderstanding(input, stepIds, irHash);
  if (llm.understanding) {
    return { understanding: llm.understanding, warnings };
  }

  if (mode === "llm") {
    /** Modo estrito: propaga o erro. */
    throw new Error(`FlowUnderstanding LLM falhou (modo=llm): ${llm.error}`);
  }

  /** Modo auto: cai pro fallback determinístico, registra aviso. */
  warnings.push(
    `Pré-compreensão LLM falhou (${llm.error}); usando fallback determinístico.`
  );
  try {
    logger.warn(
      JSON.stringify({
        evt: "attendance_flow_understanding_fallback",
        reason: llm.error,
        irHash
      })
    );
  } catch {
    /* ignore log */
  }
  return {
    understanding: buildDeterministicFallback(input.steps, input.definition, irHash),
    warnings
  };
}

/* -------------------------------------------------------------------------- */
/*                              Digest p/ system prompt                       */
/* -------------------------------------------------------------------------- */

/**
 * Resumo curto da pré-compreensão para injeção em runtime no system prompt (entrega 7).
 * Mantém tokens baixos e foca no que muda o comportamento da LLM principal.
 */
export function buildFlowUnderstandingDigest(u: FlowUnderstanding): FlowUnderstandingDigest {
  return {
    globalObjective: u.globalObjective,
    audience: u.audience,
    totalSteps: u.stepMap.length,
    terminalStates: u.terminalStates,
    slotsExpected: u.slotsExpected.map((s) => ({ slotName: s.slotName, type: s.type })),
    risksSummary: u.risksDetected
      .filter((r) => r.severity !== "info")
      .map((r) => `[${r.severity}] ${r.message}`)
      .slice(0, 6)
  };
}

/** Reexport para testes / consumidores externos. */
export { validateFlowUnderstanding };
