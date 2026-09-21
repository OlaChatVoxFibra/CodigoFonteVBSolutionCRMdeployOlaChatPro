/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { anthropicMessagesCreate } from "../runtime/AnthropicRuntime";
import { parseAnthropicError, ParsedAnthropicError } from "./anthropicApiErrors";
import { ANTHROPIC_DEFAULT_MODEL, resolveAnthropicModelId } from "./anthropicModelResolve";

/** Modelos leves para validar API Key (ordem: preferido → fallbacks baratos). */
function buildProbeModelChain(preferredModel?: string): string[] {
  const preferred = preferredModel ? resolveAnthropicModelId(preferredModel) : "";
  const chain = [
    preferred,
    ANTHROPIC_DEFAULT_MODEL,
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-20241022"
  ].filter(Boolean);
  return [...new Set(chain)];
}

/**
 * Testa a API Key com uma mensagem mínima. Retorna null se OK.
 * Em crédito insuficiente retorna parsed com kind credit_balance (salvar com aviso).
 * Em chave inválida lança via AppError no caller.
 */
export async function probeAnthropicApiKey(
  apiKey: string,
  preferredModel?: string
): Promise<ParsedAnthropicError | null> {
  const models = buildProbeModelChain(preferredModel);
  let lastParsed: ParsedAnthropicError | null = null;

  for (const model of models) {
    try {
      await anthropicMessagesCreate({
        apiKey,
        model,
        maxTokens: 32,
        temperature: 1,
        messages: [{ role: "user", content: "ok" }]
      });
      return null;
    } catch (e: unknown) {
      const parsed = parseAnthropicError(e);
      lastParsed = parsed;
      if (parsed.kind === "invalid_key" || parsed.kind === "credit_balance") {
        return parsed;
      }
      if (parsed.kind === "model") {
        continue;
      }
      return parsed;
    }
  }

  return (
    lastParsed || {
      kind: "unknown",
      userMessage:
        "Não foi possível validar a API Key com os modelos disponíveis. Verifique o modelo padrão e os créditos na Anthropic.",
      raw: ""
    }
  );
}
