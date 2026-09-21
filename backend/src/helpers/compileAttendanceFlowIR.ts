/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Compilador IR do fluxo de atendimento (PR 1 — fluxo-agente-IA-senior-revamp).
 *
 * Recebe o roteiro v2 (texto livre + smart actions cadastradas + biblioteca de mídias)
 * e produz:
 *   - Step IR enriquecido: title, objective, expectedReply, slotName, branchesIR,
 *     commandsIR (com `when` resolvido), customerVisibleText, trainingMarkers.
 *   - Rascunho de AttendanceFlowDefinition: entryStepId, fallbackStepId, policy,
 *     compilerVersion, transitionHooks (vazio por default — preenchido pela UI),
 *     lastCompiledAt.
 *
 * Princípios de design:
 *   - Sem chamada LLM aqui. Heurísticas determinísticas (regex, contagem de marcadores,
 *     análise da pergunta na última linha visível). A LLM entra no `Understanding` (entrega 3).
 *   - Idempotente: rodar duas vezes sobre o mesmo input dá o mesmo IR.
 *   - Retrocompat: se o roteiro não tem marcadores (`---` / `# ETAPA`), cai no auto-split
 *     semântico leve; se mesmo assim só houver um passo, devolve um passo só (como hoje).
 *   - Os comandos `/slug` existentes continuam sendo classificados como `on_present`
 *     (corpo da etapa) ou `after_reply` (após "EXEMPLO DE RESPOSTA" / cauda) — sem
 *     mudar o comportamento atual do `presentStepWithScriptCommands`.
 */

import {
  splitAttendanceScriptIntoStepParts,
  scriptHasExplicitStepMarkers,
  type AttendanceFlowStepDraft
} from "./promptV2Payload";
import { stripAgentFlowScriptTrainingMarkers } from "./stripAgentFlowScriptTrainingMarkers";
import {
  extractSlashCommandSlugsFromScriptBlock,
  extractSlashCommandsFromTrainingTail,
  sliceAgentStepTextForInitialSend
} from "./agentScriptInitialSendSlice";

export const FLOW_COMPILER_VERSION = 1;

export type ExpectedReplyKind =
  | "text"
  | "choice"
  | "date"
  | "number"
  | "yes_no"
  | "open"
  | "none";

export type StepBranchIR = {
  matcher: "choice" | "regex" | "semantic" | "always";
  /** Texto-chave para semantic (ex.: "agendar"), pattern para regex, slug da choice etc. */
  value: string;
  /** Para onde ir (stepId humano "s2" ou null/"end"). */
  nextStepId: string | null;
  label: string;
};

export type StepCommandIR = {
  slug: string;
  smartActionId?: number | null;
  /** Momento em que o gatilho é avaliado pelo motor de turno. */
  when: "on_present" | "after_reply" | "on_enter" | "on_exit";
  deferred?: boolean;
  kind?: string;
};

export type StepTrainingMarkers = {
  examples: string[];
  objections: string[];
};

export type CompiledStepIR = {
  /** Identificador estável dentro do fluxo. Ex.: "s1". */
  stepId: string;
  /** Posição 1-based. */
  stepNumber: number;
  title: string;
  objective: string;
  expectedReply: ExpectedReplyKind;
  slotName: string | null;
  slotSchema: Record<string, unknown> | null;
  /** Texto bruto da etapa (entrada do autor). */
  agentPrompt: string;
  /** Pré-renderizado: o que efetivamente vai ao cliente. */
  customerVisibleText: string;
  trainingMarkers: StepTrainingMarkers;
  branchesIR: StepBranchIR[];
  commandsIR: StepCommandIR[];
  /** Mantido para retrocompat com o motor atual. */
  responseOptions: unknown[];
  /** Mantido para retrocompat. */
  conditions: unknown[];
  /** Anexos do passo (mantém shape atual). */
  attachments: unknown[];
};

export type CompiledFlowDefinitionDraft = {
  entryStepId: string | null;
  fallbackStepId: string | null;
  policy: {
    maxTurnsPerStep: number;
    allowBackJump: boolean;
    allowCorrection: boolean;
    strictMode: boolean;
    semanticSplit: boolean;
    strictUnderstanding: boolean;
  };
  compilerVersion: number;
  transitionHooks: unknown[];
  lastCompiledAt: string;
};

export type CompileAttendanceFlowIRInput = {
  script: string;
  fallbackAgentPrompt?: string;
  /** Lista de smart actions cadastradas para o agente — usada para amarrar commandsIR.smartActionId. */
  smartActions?: Array<{
    id?: number | string | null;
    slug?: string | null;
    type?: string | null;
    name?: string | null;
  }>;
  /** Biblioteca de mídias — slugs que não são ação são potencialmente referências a mídia. */
  mediaLibrary?: Array<{ slug?: string | null }>;
  /** Política inicial (UI manda; default razoável). */
  policy?: Partial<CompiledFlowDefinitionDraft["policy"]>;
  /** Anexos por draft, preservados pelo compilador (entrada do front). */
  stepAttachmentsByIndex?: Array<unknown[] | undefined>;
};

export type CompileAttendanceFlowIRResult = {
  steps: CompiledStepIR[];
  definition: CompiledFlowDefinitionDraft;
  warnings: string[];
};

const RE_EXEMPLO = /EXEMPLO\s+DE\s+RESPOSTA/i;
/** Pega "OBJEÇÕES" / "OBJECOES" / "OBJECOES" — tolerante a acentos. */
const RE_OBJECOES_HEADER = /(^|\n)\s*#?\s*OBJE[CÇ][^\s]*S\b/i;

/** Pergunta no final do bloco visível. */
function endsWithQuestion(visible: string): boolean {
  const lines = String(visible || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return false;
  return /\?\s*$/.test(lines[lines.length - 1]);
}

/** Última pergunta visível na etapa (texto da linha). */
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

function normalizeNaturalChoiceOption(option: string): string {
  return String(option || "")
    .replace(/\?+$/g, "")
    .replace(/^[\s,.;:–—-]+/, "")
    .replace(/[\s,.;:–—-]+$/, "")
    .replace(/^(mais|por|de|da|do|em|na|no)\s+/i, "")
    .trim();
}

function extractNaturalChoiceOptions(visible: string): string[] {
  const question = lastQuestionLine(visible) || "";
  if (!question || !/\bou\b/i.test(question) || !/,/.test(question)) return [];

  const withoutQuestion = question.replace(/\?+$/g, "").trim();
  const captured =
    withoutQuestion.match(/\b(?:procura\s+mais|prefere|quer|busca|precisa(?:\s+de)?|escolhe(?:r)?|entre)\s+(.+)$/i)?.[1] ||
    withoutQuestion.match(/:\s*(.+)$/)?.[1] ||
    "";
  const candidate = captured || withoutQuestion;
  const parts = candidate
    .split(/\s*,\s*|\s+ou\s+/i)
    .map(normalizeNaturalChoiceOption)
    .filter((p) => p.length >= 3 && p.length <= 90);

  const unique = [...new Set(parts.map((p) => p.replace(/\s+/g, " ")))];
  if (unique.length < 2 || unique.length > 6) return [];
  if (unique.some((p) => /\b(nome|email|telefone|cidade|empresa)\b/i.test(p))) return [];
  return unique;
}

function inferNaturalChoiceSlotName(question: string): string | null {
  const q = String(question || "").toLowerCase();
  if (/\b(dificuldade|problema|desafio|dor)\b/i.test(q)) return "pain";
  if (/\b(procura|busca|interesse|objetivo|foco|precisa|quer)\b/i.test(q)) return "interest";
  return "choice";
}

const MONTH_NAMES_REGEX =
  /(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i;

function inferExpectedReply(visible: string, rawStepText: string): {
  expectedReply: ExpectedReplyKind;
  slotName: string | null;
} {
  const v = String(visible || "").toLowerCase();
  const raw = String(rawStepText || "");

  /** Quando o texto visível só tem linhas `/comando`, é uma etapa automática (sem espera). */
  const nonCommandVisibleLines = String(visible || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\/[a-zA-Z][a-zA-Z0-9_-]*\s*$/.test(l));
  if (!nonCommandVisibleLines.length) {
    if (/\/[a-zA-Z][a-zA-Z0-9_-]*/.test(raw)) {
      return { expectedReply: "none", slotName: null };
    }
    return { expectedReply: "open", slotName: null };
  }

  const qLine = lastQuestionLine(v) || "";
  const ask = qLine || v;

  /** Choice — menu numerado: olhar o texto inteiro (ícones podem estar antes da pergunta). */
  if (
    /[1-9]\uFE0F?\u20E3/.test(v) ||
    /[1-9]️⃣/.test(v) ||
    /\bop(ç|c)(ã|a)o\s*[1-9]\b/.test(v) ||
    /\b(\d)\s*ou\s*(\d)\b/.test(ask)
  ) {
    return { expectedReply: "choice", slotName: null };
  }

  /** yes/no — pergunta tipo "sim/não" ou "pode/quer". */
  if (
    /\b(sim\s+ou\s+n[aã]o|sim\/n[aã]o|sim,?\s*n[aã]o)\b/i.test(ask) ||
    /\(sim\/n[aã]o\)/i.test(ask)
  ) {
    return { expectedReply: "yes_no", slotName: null };
  }

  /** Choice — opções em linguagem natural: "A, B ou C?" */
  const naturalChoices = extractNaturalChoiceOptions(visible);
  if (naturalChoices.length >= 2) {
    return { expectedReply: "choice", slotName: inferNaturalChoiceSlotName(ask) };
  }

  /**
   * Number — quantidade. Verificado ANTES de "date" porque "quantos/quantas pessoas viajar"
   * tem tanto sinal de número quanto de viagem; o número é o slot principal.
   */
  if (
    /\b(quantos?|quantas?|qtd|n[uú]mero\s+de|adultos?|crian[cç]as?)\b/i.test(ask) ||
    /\bpessoas?\b/i.test(ask)
  ) {
    return { expectedReply: "number", slotName: "groupSize" };
  }
  if (/\b(valor|or[cç]amento|investimento|or[cç]a)\b/i.test(ask)) {
    return { expectedReply: "number", slotName: "budget" };
  }

  /** Date — pergunta menciona data, dia, horário, período, agendamento. */
  if (
    /\b(data|dia|hor[aá]rio|per[ií]odo|quando|viajar|reservar|hosped|agend)/i.test(ask) ||
    MONTH_NAMES_REGEX.test(ask)
  ) {
    return { expectedReply: "date", slotName: "preferredDate" };
  }

  /** Pergunta aberta com `?` — texto livre. */
  if (endsWithQuestion(v)) {
    return { expectedReply: "text", slotName: null };
  }

  /** Sem `?` e com texto: provavelmente apresentação/saudação — não exige resposta tipada. */
  return { expectedReply: "open", slotName: null };
}

function deriveStepTitle(
  visible: string,
  fallbackIndex: number,
  headerTitle: string | null
): string {
  if (headerTitle) return headerTitle.slice(0, 120);
  const lines = String(visible || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return `Etapa ${fallbackIndex}`;
  const first = lines[0];
  /** Linha "# ETAPA 2 — Abertura" → "Abertura". */
  const m = first.match(/^#?\s*(?:etapa|passo|próxima\s+etapa|nova\s+etapa)?\s*\d*\s*[—\-:.]\s*(.+)$/i);
  if (m && m[1]) return m[1].trim().slice(0, 120) || `Etapa ${fallbackIndex}`;
  /** Pega só os 80 primeiros caracteres da primeira linha como título humano. */
  return first.replace(/^#+\s*/, "").slice(0, 80) || `Etapa ${fallbackIndex}`;
}

/**
 * Extrai títulos dos cabeçalhos `# ETAPA N — Título` / `# PASSO ... — Título` na ordem
 * em que aparecem no script. Como `splitAttendanceScriptIntoStepParts` descarta essas
 * linhas, precisamos coletá-las antes do split para preservar o título humano.
 */
function extractStepHeaderTitles(rawScript: string): (string | null)[] {
  const titles: (string | null)[] = [];
  const re =
    /(?:\r?\n|^)\s*#?\s*(?:pr[oó]xima\s+etapa|pr[oó]ximo\s+passo|nova\s+etapa|next\s+step|etapa|passo|\d+[\.)])\s*([^\n\r]*)\s*(?:\r?\n|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawScript)) !== null) {
    const tail = String(m[1] || "").trim();
    /** Remove eventual numeração isolada como "2" / "2 —" e mantém só o nome humano. */
    const cleaned = tail
      .replace(/^\d+\s*[—\-:.]\s*/, "")
      .replace(/^[—\-:.]\s*/, "")
      .trim();
    titles.push(cleaned.length > 0 ? cleaned : null);
  }
  return titles;
}

function deriveStepObjective(
  visible: string,
  expected: ExpectedReplyKind,
  isLast: boolean
): string {
  const qLine = lastQuestionLine(visible);
  if (qLine) return `Obter resposta: ${qLine.replace(/\?+$/, "").trim()}.`;
  if (expected === "none") return "Executar ações automáticas (sem espera de resposta).";
  if (isLast) return "Encerrar a conversa com confirmação ou orientação final.";
  return "Apresentar contexto e preparar a próxima pergunta do roteiro.";
}

function extractTrainingMarkers(rawStepText: string): StepTrainingMarkers {
  const s = String(rawStepText || "").replace(/\r\n/g, "\n");
  const examples: string[] = [];
  const objections: string[] = [];

  /** Captura cada "EXEMPLO ..." até o próximo "RESPOSTA:" / divisor / próximo "EXEMPLO". */
  const reExample =
    /EXEMPLO\s+DE\s+RESPOSTA[^\n]*\n([\s\S]*?)(?=\n\s*RESPOSTA\s*:|\n\s*EXEMPLO\s+DE\s+RESPOSTA|\n\s*---\s*\n|\n\s*#\s+[^\n]+|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = reExample.exec(s)) !== null) {
    const block = String(m[1] || "").trim();
    if (block) examples.push(block);
  }

  const objHeaderIdx = s.search(RE_OBJECOES_HEADER);
  if (objHeaderIdx >= 0) {
    const tail = s.slice(objHeaderIdx).replace(/^\s*#?\s*OBJE[CÇ][AÃ]O(E)?S\b\s*\n?/i, "").trim();
    if (tail) objections.push(tail.slice(0, 4000));
  }

  return { examples, objections };
}

/**
 * Encontra um par "EXEMPLO ... \n RESPOSTA: <texto>" no corpo bruto do passo e devolve
 * uma branch semântica: matcher pelo EXEMPLO (label) → próximo passo (fluxo linear).
 */
function deriveSemanticBranches(rawStepText: string, nextStepId: string | null): StepBranchIR[] {
  const s = String(rawStepText || "").replace(/\r\n/g, "\n");
  const re =
    /EXEMPLO\s+DE\s+RESPOSTA(?:\s+DO\s+LEAD)?[^\n]*\n([\s\S]*?)(?:\n\s*RESPOSTA\s*:|\n\s*EXEMPLO\s+DE\s+RESPOSTA|\n\s*---\s*\n|\n\s*#\s+[^\n]+|$)/gi;
  const out: StepBranchIR[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const raw = String(m[1] || "").trim();
    if (!raw) continue;
    /** Tira aspas inteligentes e cifras de exemplo "..." | '...' */
    const cleaned = raw
      .replace(/^[\s"'“”‘’«»]+/, "")
      .replace(/[\s"'“”‘’«»]+$/, "")
      .slice(0, 240);
    if (!cleaned) continue;
    out.push({
      matcher: "semantic",
      value: cleaned,
      nextStepId,
      label: cleaned.slice(0, 80)
    });
  }
  return out;
}

function deriveNaturalChoiceBranches(visible: string, nextStepId: string | null): StepBranchIR[] {
  return extractNaturalChoiceOptions(visible).map((choice) => ({
    matcher: "semantic",
    value: choice,
    nextStepId,
    label: choice.slice(0, 80)
  }));
}

function indexSmartActionsBySlug(
  smartActions: CompileAttendanceFlowIRInput["smartActions"]
): Map<string, { id?: number | string | null; type?: string | null; name?: string | null }> {
  const idx = new Map<string, { id?: number | string | null; type?: string | null; name?: string | null }>();
  for (const a of smartActions || []) {
    const slug = String(a?.slug || "")
      .replace(/^\//, "")
      .toLowerCase();
    if (!slug) continue;
    idx.set(slug, a);
  }
  return idx;
}

function isMediaSlug(
  slug: string,
  mediaLibrary: CompileAttendanceFlowIRInput["mediaLibrary"]
): boolean {
  const target = String(slug || "").toLowerCase();
  return (mediaLibrary || []).some(
    (m) => String(m?.slug || "").toLowerCase() === target
  );
}

function slugLooksLikeTransfer(slug: string): boolean {
  const l = String(slug || "").toLowerCase();
  return (
    l.includes("transferir") ||
    l.includes("transfer") ||
    l === "transferirchamado" ||
    l === "transferiratendimento"
  );
}

function slugLooksLikeAgendamento(slug: string): boolean {
  const l = String(slug || "").toLowerCase();
  return (
    l === "agendamento" ||
    l === "agendar" ||
    l.includes("marcarhorario") ||
    l.includes("marcar_horario")
  );
}

function deriveCommandsIR(
  rawStepText: string,
  smartActionsIdx: ReturnType<typeof indexSmartActionsBySlug>,
  mediaLibrary: CompileAttendanceFlowIRInput["mediaLibrary"]
): { commandsIR: StepCommandIR[]; warnings: string[] } {
  const warnings: string[] = [];
  const headPortion = sliceAgentStepTextForInitialSend(rawStepText);
  const tailSlugs = extractSlashCommandsFromTrainingTail(rawStepText);
  const headSlugs = extractSlashCommandSlugsFromScriptBlock(headPortion);

  const commandsIR: StepCommandIR[] = [];
  const seen = new Set<string>();

  const push = (slug: string, when: StepCommandIR["when"]) => {
    const norm = String(slug || "")
      .replace(/^\//, "")
      .trim();
    if (!norm) return;
    if (isMediaSlug(norm, mediaLibrary)) {
      /** Mídia inline não vira commandIR (vai pelo path de mídia atual). */
      return;
    }
    const dedupKey = `${when}:${norm.toLowerCase()}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);
    const action = smartActionsIdx.get(norm.toLowerCase());
    const cmd: StepCommandIR = {
      slug: norm,
      smartActionId:
        action?.id != null && Number.isFinite(Number(action.id)) ? Number(action.id) : null,
      when,
      deferred: when === "after_reply"
    };
    if (slugLooksLikeAgendamento(norm)) cmd.kind = "agendamento";
    else if (slugLooksLikeTransfer(norm)) cmd.kind = "transferir";
    else if (action?.type) cmd.kind = String(action.type).toLowerCase();
    if (!action) {
      warnings.push(`Comando "/${norm}" no script não possui ação cadastrada nem mídia com este slug.`);
    }
    commandsIR.push(cmd);
  };

  for (const s of headSlugs) push(s, "on_present");
  for (const s of tailSlugs) push(s, "after_reply");

  return { commandsIR, warnings };
}

function defaultPolicy(): CompiledFlowDefinitionDraft["policy"] {
  return {
    maxTurnsPerStep: 4,
    allowBackJump: false,
    allowCorrection: true,
    strictMode: false,
    semanticSplit: true,
    strictUnderstanding: false
  };
}

/**
 * Pipeline principal de compilação: roteiro → IR.
 */
export function compileAttendanceFlowIR(
  input: CompileAttendanceFlowIRInput
): CompileAttendanceFlowIRResult {
  const warnings: string[] = [];
  const fallback = String(input.fallbackAgentPrompt || "").trim() || "Olá! Como posso ajudar?";
  const rawScript = String(input.script || "").trim();
  const smartActionsIdx = indexSmartActionsBySlug(input.smartActions);
  const mediaLibrary = input.mediaLibrary || [];

  let parts: string[];
  let headerTitles: (string | null)[] = [];
  if (!rawScript) {
    /** Sem roteiro: cria 1 passo só com fallback (igual ao buildAttendanceFlowStepsFromV2Script). */
    parts = [fallback];
  } else {
    parts = splitAttendanceScriptIntoStepParts(rawScript);
    headerTitles = extractStepHeaderTitles(rawScript);
    if (parts.length === 1 && !scriptHasExplicitStepMarkers(rawScript)) {
      /** Auto-split semântico LEVE: quando o autor não usou marcadores, tentar quebrar por seções
       *  delimitadas por linhas em branco quando o resultado é estruturalmente coerente. */
      const candidates = rawScript
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
      const looksLikeStructured =
        candidates.length >= 2 &&
        candidates.some((c) => /^(mensagem|resposta)\s*:/i.test(c)) &&
        candidates.length <= 12;
      if (looksLikeStructured) {
        parts = candidates;
        headerTitles = [];
        warnings.push(
          "Roteiro sem marcadores explícitos (`---` ou `# ETAPA`) — usei auto-split heurístico em " +
            candidates.length +
            " etapas. Considere adicionar marcadores para travar a divisão."
        );
      }
    }
  }

  if (parts.length === 0) parts = [fallback];

  /** Passos com seus IDs estáveis. */
  const stepIds = parts.map((_, i) => `s${i + 1}`);

  const steps: CompiledStepIR[] = parts.map((rawStepText, idx) => {
    const stepId = stepIds[idx];
    const stepNumber = idx + 1;
    const isLast = idx === parts.length - 1;
    const customerVisibleText = stripAgentFlowScriptTrainingMarkers(rawStepText);
    const { expectedReply, slotName } = inferExpectedReply(customerVisibleText, rawStepText);
    const headerTitle = headerTitles[idx] || null;
    const title = deriveStepTitle(customerVisibleText || rawStepText, stepNumber, headerTitle);
    const objective = deriveStepObjective(customerVisibleText, expectedReply, isLast);
    const trainingMarkers = extractTrainingMarkers(rawStepText);
    const branchesIR = [
      ...deriveNaturalChoiceBranches(customerVisibleText, isLast ? null : stepIds[idx + 1] || null),
      ...deriveSemanticBranches(rawStepText, isLast ? null : stepIds[idx + 1] || null)
    ];
    if (!branchesIR.length && !isLast) {
      branchesIR.push({
        matcher: "always",
        value: "*",
        nextStepId: stepIds[idx + 1] || null,
        label: "fluxo linear"
      });
    }
    const cmdRes = deriveCommandsIR(rawStepText, smartActionsIdx, mediaLibrary);
    warnings.push(...cmdRes.warnings.map((w) => `Etapa ${stepNumber}: ${w}`));

    /** Aviso de validação: pergunta sem branch e sem `expectedReply` útil. */
    if (
      expectedReply === "open" &&
      customerVisibleText.trim() &&
      endsWithQuestion(customerVisibleText) &&
      !branchesIR.length &&
      !isLast
    ) {
      warnings.push(
        `Etapa ${stepNumber} faz pergunta aberta, mas o compilador não inferiu o tipo de resposta esperada. Resultado pode ser ambíguo.`
      );
    }

    const attachments = Array.isArray(input.stepAttachmentsByIndex?.[idx])
      ? (input.stepAttachmentsByIndex![idx] as unknown[])
      : [];

    return {
      stepId,
      stepNumber,
      title,
      objective,
      expectedReply,
      slotName,
      slotSchema: null,
      agentPrompt: rawStepText,
      customerVisibleText,
      trainingMarkers,
      branchesIR,
      commandsIR: cmdRes.commandsIR,
      responseOptions: [],
      conditions: [],
      attachments
    };
  });

  const definition: CompiledFlowDefinitionDraft = {
    entryStepId: stepIds[0] || null,
    fallbackStepId: stepIds[0] || null,
    policy: {
      ...defaultPolicy(),
      ...(input.policy || {})
    },
    compilerVersion: FLOW_COMPILER_VERSION,
    transitionHooks: [],
    lastCompiledAt: new Date().toISOString()
  };

  /** Validação cruzada final: cada nextStepId existe? */
  const validIds = new Set(stepIds);
  for (const s of steps) {
    for (const b of s.branchesIR) {
      if (b.nextStepId != null && b.nextStepId !== "end" && !validIds.has(b.nextStepId)) {
        warnings.push(
          `Etapa ${s.stepNumber}: branch "${b.label}" aponta para nextStepId="${b.nextStepId}" inexistente.`
        );
      }
    }
  }

  return { steps, definition, warnings };
}

/**
 * Adapta o IR compilado para o formato legado usado por `AttendanceFlowStep.create`
 * (mantém `agentPrompt`, `responseOptions`, `conditions`, `attachments` + adiciona colunas IR).
 */
export function compiledStepsToLegacyDrafts(
  steps: CompiledStepIR[]
): AttendanceFlowStepDraft[] {
  return steps.map((s) => ({
    agentPrompt: s.agentPrompt,
    responseOptions: s.responseOptions || [],
    conditions: s.conditions || [],
    attachments: s.attachments || []
  }));
}

/** Reexport conveniente para o controller / services. */
export { splitAttendanceScriptIntoStepParts } from "./promptV2Payload";
