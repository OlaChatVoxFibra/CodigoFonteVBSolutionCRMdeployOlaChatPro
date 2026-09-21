/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * ConversationContextDigest (PR 14)
 *
 * Monta um bloco compacto (~200 tokens) com o estado real da conversa para
 * injetar no system prompt da LLM. Garante que o agente:
 *   - sabe que etapas já foram concluídas;
 *   - sabe quais slots foram preenchidos;
 *   - vê os últimos turnos relevantes;
 *   - conhece intents pendentes (PR 12);
 * e respeita a regra: NUNCA pergunte de novo algo já respondido.
 *
 * Diferente do `buildAttendanceFlowLlmAnchor` (que é prosa longa de instrução),
 * este digest é "fato → regra" e cabe junto sem inflar token-count.
 */

import Ticket from "../models/Ticket";
import { normalizeAttendanceFlowMemory } from "./agentAttendanceFlowMemory";
import {
  formatConversationalMemoryForPrompt,
  normalizeAgentConversationalMemory
} from "./agentConversationalMemory";

interface ConversationTurnLike {
  fromMe: boolean;
  body?: string | null;
  createdAt?: Date | string;
}

export interface ConversationContextDigestOpts {
  ticket: Ticket;
  promptId: number;
  promptStateKey?: string;
  /** Últimos N turnos de mensagem (Message[]); mais recentes por último. */
  recentTurns?: ConversationTurnLike[];
  /** Máximo de turnos a citar; default 3. */
  maxTurns?: number;
}

function truncate(s: string, max: number): string {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildConversationContextDigest(
  opts: ConversationContextDigestOpts
): string {
  const { ticket, promptId } = opts;
  const maxTurns = Math.max(1, Math.min(opts.maxTurns ?? 3, 10));

  let af: any = null;
  try {
    const dw =
      (ticket as any).getDataValue?.("dataWebhook") ??
      (ticket as any).dataWebhook;
    const raw =
      dw && typeof dw === "object" && !Array.isArray(dw)
        ? (dw as Record<string, any>).attendanceFlow
        : null;
    if (raw && typeof raw === "object" && raw.promptId != null && Number(raw.promptId) !== Number(promptId)) {
      af = null;
    } else {
      af = normalizeAttendanceFlowMemory(raw, promptId);
    }
  } catch {
    af = null;
  }

  let dw: Record<string, any> = {};
  try {
    const raw =
      (ticket as any).getDataValue?.("dataWebhook") ??
      (ticket as any).dataWebhook;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      dw = raw as Record<string, any>;
    } else if (typeof raw === "string") {
      try {
        dw = JSON.parse(raw);
      } catch {
        dw = {};
      }
    }
  } catch {
    dw = {};
  }
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const pendingIntents = Array.isArray(agentState.pendingIntents) ? agentState.pendingIntents : [];
  const llmFirstState =
    agentState.llmFirstState && typeof agentState.llmFirstState === "object"
      ? (agentState.llmFirstState as Record<string, any>)
      : {};
  const scopedLlmFirstState =
    Number(llmFirstState.promptId) === Number(promptId) &&
    (!opts.promptStateKey || llmFirstState.promptStateKey === opts.promptStateKey)
      ? llmFirstState
      : {};
  const normalizedConversationalMemory = normalizeAgentConversationalMemory(
    agentState.conversationalMemory,
    promptId
  );
  const conversationalMemory =
    Number(normalizedConversationalMemory.promptId) === Number(promptId)
      ? normalizedConversationalMemory
      : normalizeAgentConversationalMemory(null, promptId);

  const completed = (af?.completedSteps as number[] | undefined) || [];
  const lastStep = Number(af?.lastPresentedStep || 0);
  const answers = (af?.answersByStep || {}) as Record<string, string>;

  const completedLine = completed.length
    ? `Etapas concluídas: ${completed
        .map((n) => `s${n}${answers[String(n)] ? ` (“${truncate(answers[String(n)], 40)}”)` : ""}`)
        .join(", ")}`
    : "Etapas concluídas: nenhuma ainda";

  const activeLine = lastStep > 0
    ? `Etapa ativa: s${lastStep}${af?.awaitingUserReply ? " (aguardando resposta do cliente)" : ""}`
    : "Etapa ativa: (ainda não iniciada)";

  const slotsLine = Object.keys(answers).length
    ? `Slots preenchidos: ${Object.entries(answers)
        .map(([k, v]) => `s${k}=${truncate(String(v || ""), 40)}`)
        .join(" | ")}`
    : "Slots preenchidos: nenhum";

  const intentsLine = pendingIntents.length
    ? `Intents pendentes: ${pendingIntents
        .map((p: any) => `${p.kind}${p.satisfiedBy ? ` (espera ${p.satisfiedBy})` : ""}`)
        .join(", ")}`
    : "Intents pendentes: nenhuma";
  const memoryLine = formatConversationalMemoryForPrompt(conversationalMemory);
  const semanticStateLine = Object.keys(scopedLlmFirstState).length
    ? `Estado semântico LLM-first: intenção=${truncate(String(scopedLlmFirstState.userIntent || ""), 80)} | objetivo=${truncate(String(scopedLlmFirstState.currentObjective || ""), 100)} | etapa=${truncate(String(scopedLlmFirstState.currentStage || ""), 80)} | pendências=${Array.isArray(scopedLlmFirstState.missingData) ? scopedLlmFirstState.missingData.join(", ") || "nenhuma" : "nenhuma"}`
    : "Estado semântico LLM-first: ainda não consolidado";
  const llmQuestionLine = Object.keys(scopedLlmFirstState).length
    ? `Última pergunta LLM-first: ${truncate(String(scopedLlmFirstState.lastAssistantQuestion || ""), 140) || "nenhuma"} | última resposta do cliente: ${truncate(String(scopedLlmFirstState.lastUserAnswer || ""), 100) || "nenhuma"}`
    : "Última pergunta LLM-first: nenhuma";
  const askedQuestionsLine = Array.isArray(scopedLlmFirstState.askedQuestions) && scopedLlmFirstState.askedQuestions.length
    ? `Perguntas já feitas pela IA: ${scopedLlmFirstState.askedQuestions.slice(-5).map((q: unknown) => `“${truncate(String(q || ""), 90)}”`).join(" | ")}`
    : "Perguntas já feitas pela IA: nenhuma registrada";
  const completedLlmStagesLine = Array.isArray(scopedLlmFirstState.completedStages) && scopedLlmFirstState.completedStages.length
    ? `Etapas semânticas já vencidas pela LLM: ${scopedLlmFirstState.completedStages.slice(-6).map((s: unknown) => truncate(String(s || ""), 70)).join(" -> ")}`
    : "Etapas semânticas já vencidas pela LLM: nenhuma registrada";

  const turns = (opts.recentTurns || []).slice(-maxTurns);
  const turnsBlock = turns.length
    ? turns
        .map((t, idx) => {
          const who = t.fromMe ? "AGENTE" : "CLIENTE";
          const body = truncate(String(t.body || ""), 260);
          return `${idx + 1}) ${who}: ${body}`;
        })
        .join("\n")
    : "(sem turnos recentes registrados)";

  return [
    "CONTEXTO DA CONVERSA (autoritativo — não contradiga):",
    `- ${completedLine}`,
    `- ${activeLine}`,
    `- ${slotsLine}`,
    `- ${intentsLine}`,
    `- ${semanticStateLine}`,
    `- ${llmQuestionLine}`,
    `- ${askedQuestionsLine}`,
    `- ${completedLlmStagesLine}`,
    "- Memória lógica:",
    memoryLine,
    "Últimos turnos:",
    turnsBlock,
    "DECISÃO OBRIGATÓRIA ANTES DA RESPOSTA:",
    "A) A mensagem atual respondeu a última pergunta? Se sim, use essa resposta e avance.",
    "B) Faltou só uma informação? Peça apenas essa informação, sem voltar ao início.",
    "C) Há action pronta para executar? Prepare/continue com os dados já coletados; não peça campos preenchidos.",
    "D) O fluxo acabou ou ficou sem texto automático? Responda consultivamente pelo contexto; nunca deixe o cliente sem retorno.",
    "E) A última fala do agente tinha duas perguntas e o cliente respondeu só uma? Reconheça a parte respondida e pergunte somente a pendente.",
    "REGRAS DE OURO:",
    "1) NUNCA pergunte algo que já consta em 'Slots preenchidos' acima.",
    "2) NUNCA repita um bloco de mensagem que você já enviou nos últimos turnos.",
    "3) Avance só UMA etapa por mensagem — não empilhe perguntas.",
    "4) Se houver intent pendente, conduza para satisfazê-la antes de abrir novo tópico.",
    "5) Use a memória lógica para interpretar mensagens curtas ou implícitas antes de pedir reformulação.",
    "6) Antes de responder, decida internamente: regra geral aplicável, etapa/trecho do roteiro, dado já coletado, dado pendente e próxima ação.",
    "7) Se o risco de loop/repetição estiver alto, não repita a última pergunta; avance quando a resposta já estiver nos slots, memória ou turnos recentes.",
    "8) Para lead/tarefa/contato, use memória + últimos turnos para preencher campos; pergunte só nome/telefone/dado essencial realmente ausente.",
    "9) Regras Gerais do agente controlam tom, limites e prioridades mesmo quando o roteiro sugerir outra formulação.",
    "10) É proibido consumir um turno substantivo sem resposta visível ou ação clara; se o fluxo visual não enviou nada, continue pela LLM usando este contexto."
  ].join("\n");
}
