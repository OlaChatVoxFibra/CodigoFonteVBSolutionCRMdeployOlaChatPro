/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Detecta e recupera vazamentos do JSON interno do orquestrador LLM-first
 * (understanding / decision) que não devem ir ao cliente no WhatsApp.
 */

const ORCHESTRATOR_LEAK_PATTERNS = [
  /"understanding"\s*:/,
  /"userIntent"\s*:/,
  /"currentObjective"\s*:/,
  /"currentStage"\s*:/,
  /"missingData"\s*:/,
  /"collectedData"\s*:/,
  /"decision"\s*:/,
  /"actionSlug"\s*:/
];

function stripMarkdownJsonFence(text: string): string {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function countOrchestratorLeakMarkers(text: string): number {
  return ORCHESTRATOR_LEAK_PATTERNS.filter((pattern) => pattern.test(text)).length;
}

export function looksLikeAgentOrchestratorJsonLeak(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;

  if (/^```(?:json)?\b/i.test(raw)) return true;

  const markers = countOrchestratorLeakMarkers(raw);
  if (markers >= 2) return true;

  if (
    markers >= 1 &&
    (/^\s*\{/.test(raw) || /^\s*"understanding"\s*:\s*\{/.test(raw) || /^\s*"userIntent"\s*:/.test(raw))
  ) {
    return true;
  }

  return false;
}

function parseJsonLoose(raw: string): unknown | null {
  const stripped = stripMarkdownJsonFence(raw);
  if (!stripped) return null;
  try {
    return JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function readNaturalLanguageField(value: unknown): string {
  const text = String(value || "").trim();
  if (!text || looksLikeAgentOrchestratorJsonLeak(text)) return "";
  return text;
}

/** Tenta extrair `reply` ou `decision.nextQuestion` de um JSON do orquestrador vazado. */
export function recoverCustomerReplyFromOrchestratorLeak(text: string): string | null {
  const parsed = parseJsonLoose(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;
  const reply = readNaturalLanguageField(obj.reply);
  if (reply) return reply;

  const decision = obj.decision;
  if (decision && typeof decision === "object" && !Array.isArray(decision)) {
    const nextQuestion = readNaturalLanguageField((decision as Record<string, unknown>).nextQuestion);
    if (nextQuestion) return nextQuestion;
  }

  return null;
}

/** Remove vazamento de JSON interno; retorna string vazia se não houver texto seguro para o cliente. */
export function sanitizeOrchestratorCustomerReply(text: string): string {
  const raw = String(text || "").trim();
  if (!raw) return "";
  if (!looksLikeAgentOrchestratorJsonLeak(raw)) return raw;
  return recoverCustomerReplyFromOrchestratorLeak(raw) || "";
}

/** Sanitização final antes de enviar texto do agente ao cliente (todos os providers). */
export function sanitizeAgentOutboundReply(text: string): string {
  return sanitizeOrchestratorCustomerReply(String(text || "").trim());
}

export function tryBuildDecisionFromLeakedOrchestratorContent(
  content: string
): { reply: string } | null {
  const recovered = recoverCustomerReplyFromOrchestratorLeak(content);
  if (!recovered) return null;
  return { reply: recovered };
}
