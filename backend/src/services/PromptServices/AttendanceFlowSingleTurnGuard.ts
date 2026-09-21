/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowSingleTurnGuard (PR 6) — disciplina de turno único.
 *
 * Duas peças complementares:
 *  (1) `buildSingleStepSystemPrompt`: prefixo de system prompt focado APENAS na etapa
 *      ativa, injetando o digest do `flowUnderstanding` e regras estritas:
 *        - Responda só esta etapa, não antecipe.
 *        - Não repita a pergunta anterior se já foi respondida.
 *        - Se cliente desviou, reancore.
 *        - Use o `customerVisibleText` como base canônica.
 *
 *  (2) `postGenerationGuard`: examina a saída do LLM ANTES de enviar e:
 *        - Trunca em duas-etapas (detecta `# ETAPA`, `Etapa 2`, `\n\n---\n\n`).
 *        - Trunca após segunda pergunta `?` em parágrafos diferentes.
 *        - Remove qualquer reaparição do customerVisibleText anterior.
 *        - Retorna { text, truncated, reason }.
 */

import type { CompiledStepIR } from "../../helpers/compileAttendanceFlowIR";
import type { FlowUnderstanding } from "./AttendanceFlowUnderstandingService";

export type SingleTurnGuardOptions = {
  step: CompiledStepIR;
  understanding?: FlowUnderstanding | null;
  /** Customer-visible text da etapa ANTERIOR — não pode reaparecer. */
  previousStepVisibleText?: string | null;
  /** Última resposta do cliente (para o LLM se ancorar). */
  lastUserText?: string | null;
};

/* -------------------------------------------------------------------------- */
/*                       (1) System prompt single-step                         */
/* -------------------------------------------------------------------------- */

export function buildSingleStepSystemPrompt(opts: SingleTurnGuardOptions): string {
  const { step, understanding } = opts;
  const understandingNode = understanding?.stepMap.find((s) => s.stepId === step.stepId);
  const objective = understandingNode?.objective || step.objective || "(sem objetivo definido)";
  const successCriteria = understandingNode?.successCriteria
    ? `  - ${understandingNode.successCriteria}`
    : "  - Receber resposta clara para a pergunta acima.";
  const askedQuestion = understandingNode?.askedQuestion || "";
  const typicalReplies = understandingNode?.typicalReplies?.length
    ? understandingNode.typicalReplies.map((r) => `  - ${r}`).join("\n")
    : "  - (sem exemplos)";

  const globalGoal = understanding?.globalObjective || "Conduzir o cliente até o objetivo do fluxo.";

  return [
    "Você está conduzindo um fluxo de atendimento PASSO A PASSO. NUNCA antecipe a próxima etapa.",
    "",
    `Objetivo global: ${globalGoal}`,
    "",
    `ETAPA ATIVA: ${step.title} (${step.stepId}).`,
    `Objetivo desta etapa: ${objective}`,
    askedQuestion
      ? `Pergunta a fazer (já feita ao cliente): ${askedQuestion}`
      : "",
    "",
    "Texto canônico da etapa (use como base, NÃO modifique a pergunta):",
    "```",
    step.customerVisibleText.trim(),
    "```",
    "",
    "Critérios de sucesso desta etapa:",
    successCriteria,
    "",
    "Respostas típicas do cliente nesta etapa:",
    typicalReplies,
    "",
    "REGRAS RÍGIDAS:",
    "- Responda APENAS o necessário para esta etapa. Não diga \"a próxima etapa é…\".",
    "- NÃO repita a pergunta se o cliente acabou de responder; apenas confirme e finalize esta etapa.",
    "- Se o cliente perguntou algo fora de escopo (FAQ, preço, horário), responda com Regras gerais + FAQ + conhecimento em 1–2 frases e só então reancore esta etapa com uma pergunta curta.",
    "- NÃO inclua marcadores tipo \"# ETAPA\", \"Etapa 2:\", \"---\".",
    "- Limite a saída a 1 parágrafo curto (até ~3 frases). Sem listas longas.",
    "- Use o tom e o vocabulário do texto canônico acima."
  ]
    .filter(Boolean)
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/*                         (2) Post-generation guard                           */
/* -------------------------------------------------------------------------- */

export type PostGenGuardResult = {
  text: string;
  truncated: boolean;
  reasons: string[];
};

const RE_STEP_HEADER = /^\s*(?:#+\s*)?(?:etapa|step)\s*\d+/im;
const RE_SECTION_DIVIDER = /\n\s*(?:---|===)\s*\n/;

function clipAtFirstSectionDivider(text: string): { text: string; truncated: boolean } {
  const m = RE_SECTION_DIVIDER.exec(text);
  if (!m || m.index == null) return { text, truncated: false };
  return { text: text.slice(0, m.index).trim(), truncated: true };
}

function clipAtSecondStepHeader(text: string): { text: string; truncated: boolean } {
  const lines = text.split(/\r?\n/);
  let firstFound = false;
  for (let i = 0; i < lines.length; i++) {
    if (RE_STEP_HEADER.test(lines[i])) {
      if (!firstFound) {
        firstFound = true;
        continue;
      }
      return { text: lines.slice(0, i).join("\n").trim(), truncated: true };
    }
  }
  /** Se houve UM header de etapa, remove ele (não vai pro cliente). */
  if (firstFound) {
    const out = lines.filter((l) => !RE_STEP_HEADER.test(l)).join("\n").trim();
    return { text: out, truncated: out !== text };
  }
  return { text, truncated: false };
}

function clipAtSecondQuestion(text: string): { text: string; truncated: boolean } {
  const paragraphs = text.split(/\n{2,}/);
  let qCount = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].includes("?")) {
      qCount += 1;
      if (qCount >= 2) {
        return {
          text: paragraphs.slice(0, i).join("\n\n").trim(),
          truncated: true
        };
      }
    }
  }
  return { text, truncated: false };
}

function removePreviousStepEcho(
  text: string,
  previousVisibleText: string | null | undefined
): { text: string; truncated: boolean } {
  const prev = String(previousVisibleText || "").trim();
  if (!prev) return { text, truncated: false };
  const prevFirstLine = prev.split(/\r?\n/)[0].trim();
  if (prevFirstLine.length < 20) return { text, truncated: false };
  const escaped = prevFirstLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");
  if (re.test(text)) {
    const out = text.replace(re, "").trim();
    return { text: out, truncated: true };
  }
  return { text, truncated: false };
}

export function postGenerationGuard(
  rawText: string,
  opts: SingleTurnGuardOptions
): PostGenGuardResult {
  const reasons: string[] = [];
  let text = String(rawText || "").trim();

  const r1 = clipAtFirstSectionDivider(text);
  if (r1.truncated) reasons.push("section_divider");
  text = r1.text;

  const r2 = clipAtSecondStepHeader(text);
  if (r2.truncated) reasons.push("step_header_burst");
  text = r2.text;

  const r3 = clipAtSecondQuestion(text);
  if (r3.truncated) reasons.push("second_question_burst");
  text = r3.text;

  const r4 = removePreviousStepEcho(text, opts.previousStepVisibleText);
  if (r4.truncated) reasons.push("previous_step_echo");
  text = r4.text;

  /** Limite hard de 1200 chars por turno (segurança). */
  if (text.length > 1200) {
    text = text.slice(0, 1200).trim();
    reasons.push("max_length");
  }

  return {
    text,
    truncated: reasons.length > 0,
    reasons
  };
}
