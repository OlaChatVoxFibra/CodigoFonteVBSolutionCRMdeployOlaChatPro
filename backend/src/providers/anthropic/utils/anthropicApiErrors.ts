/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type AnthropicErrorKind =
  | "invalid_key"
  | "credit_balance"
  | "rate_limit"
  | "model"
  | "sampling"
  | "unknown";

export type ParsedAnthropicError = {
  kind: AnthropicErrorKind;
  userMessage: string;
  raw: string;
};

function extractAnthropicMessage(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const jsonStart = trimmed.indexOf("{");
    if (jsonStart >= 0) {
      const parsed = JSON.parse(trimmed.slice(jsonStart));
      const nested =
        parsed?.error?.message ||
        parsed?.error?.error?.message ||
        parsed?.message;
      if (nested && typeof nested === "string") return nested;
    }
  } catch {
    /* ignore */
  }

  const match = trimmed.match(/"message"\s*:\s*"([^"]+)"/);
  if (match?.[1]) return match[1];

  return trimmed;
}

export function parseAnthropicError(err: unknown): ParsedAnthropicError {
  const e = err as { message?: string; status?: number };
  const raw = String(e?.message || err || "");
  const lower = raw.toLowerCase();
  const apiMessage = extractAnthropicMessage(raw);
  const apiLower = apiMessage.toLowerCase();

  if (
    lower.includes("credit balance") ||
    apiLower.includes("credit balance") ||
    apiLower.includes("too low") ||
    apiLower.includes("billing") ||
    apiLower.includes("purchase credits")
  ) {
    return {
      kind: "credit_balance",
      userMessage:
        "Saldo de créditos Anthropic insuficiente. A API Key parece válida — adicione créditos em console.anthropic.com (Plans & Billing) e use a aba Teste.",
      raw
    };
  }

  if (
    e?.status === 401 ||
    lower.includes("authentication") ||
    lower.includes("invalid x-api-key") ||
    lower.includes("invalid api key") ||
    apiLower.includes("invalid api key")
  ) {
    return {
      kind: "invalid_key",
      userMessage:
        "API Key Anthropic inválida. Gere uma nova chave em console.anthropic.com → API Keys.",
      raw
    };
  }

  if (e?.status === 429 || lower.includes("rate limit") || apiLower.includes("rate limit")) {
    return {
      kind: "rate_limit",
      userMessage: "Limite de requisições Anthropic atingido. Aguarde alguns minutos e tente novamente.",
      raw
    };
  }

  if (
    apiLower.includes("temperature and top_p") ||
    apiLower.includes("cannot both be specified")
  ) {
    return {
      kind: "sampling",
      userMessage:
        "Este modelo Claude aceita apenas temperature ou top_p por requisição (não os dois). Ajuste na integração Claude: deixe top_p em 1 e altere só a temperature, ou vice-versa.",
      raw
    };
  }

  if (
    apiLower.includes("model") &&
    (apiLower.includes("not found") ||
      apiLower.includes("invalid") ||
      apiLower.includes("retired") ||
      apiLower.includes("deprecated") ||
      /^model:\s*claude/i.test(apiMessage))
  ) {
    return {
      kind: "model",
      userMessage:
        "Este modelo Claude foi descontinuado ou não está disponível na sua conta. Escolha outro modelo (ex.: Claude Sonnet 4.5 ou Haiku 4.5) e salve novamente.",
      raw
    };
  }

  const short = apiMessage || raw.slice(0, 200);
  return {
    kind: "unknown",
    userMessage: short
      ? `Erro na API Anthropic: ${short}`
      : "Não foi possível validar a integração Anthropic.",
    raw
  };
}
