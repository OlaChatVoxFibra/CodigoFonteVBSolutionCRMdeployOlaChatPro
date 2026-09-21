/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Camada opcional de correspondência semântica (OpenAI) para gatilhos de smart actions
 * na mensagem do assistente — complementa o match literal por substring/regex.
 */

import logger from "../../utils/logger";
import { OPENAI_DEFAULT_FAST_MODEL } from "../../config/openAiDefaults";

const OPENAI_V1 = "https://api.openai.com/v1";

export type SemanticSmartActionCandidate = {
  id: number;
  slug: string;
  name: string;
  agentHints: string[];
};

function extractJsonObject(text: string): { ids?: unknown } | null {
  const t = String(text || "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1].trim() : t;
  try {
    return JSON.parse(raw) as { ids?: unknown };
  } catch {
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1)) as { ids?: unknown };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function readSemanticFlag(): "off" | "auto" | "on" {
  const v = String(process.env.AGENT_INTENT_SEMANTIC_OPENAI || "auto").toLowerCase().trim();
  if (v === "0" || v === "false" || v === "no" || v === "off" || v === "disabled") return "off";
  if (v === "1" || v === "true" || v === "yes" || v === "on" || v === "enabled") return "on";
  return "auto";
}

export function shouldRunSemanticOpenAiMatch(apiKey: string | null | undefined): boolean {
  const flag = readSemanticFlag();
  if (flag === "off") return false;
  if (flag === "on") return !!String(apiKey || "").trim();
  return !!String(apiKey || "").trim();
}

/**
 * Retorna IDs numéricos de PromptSmartAction cuja intenção, na mensagem do assistente,
 * se alinha semanticamente aos exemplos configurados.
 */
export async function semanticMatchAssistantSmartActions(params: {
  assistantMessage: string;
  candidates: SemanticSmartActionCandidate[];
  apiKey: string;
  model?: string;
}): Promise<number[]> {
  const { assistantMessage, candidates, apiKey, model = OPENAI_DEFAULT_FAST_MODEL } = params;
  if (!String(apiKey || "").trim() || !candidates.length || !String(assistantMessage || "").trim()) {
    return [];
  }

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 220,
    messages: [
      {
        role: "system" as const,
        content: [
          "Você classifica qual automação deve ser preparada com base na última mensagem do ASSISTENTE (pt-BR).",
          "Cada automação tem exemplos de fala; use significado e intenção, não palavras exatas.",
          'Responda APENAS JSON válido: {"ids":[números]} — lista de id das automações que claramente se aplicam. Array vazio se nenhuma.',
          "No máximo 3 ids; nunca invente ids que não foram listados."
        ].join("\n")
      },
      {
        role: "user" as const,
        content: JSON.stringify({
          assistantMessage: String(assistantMessage).slice(0, 2400),
          automations: candidates.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            exemplosDeFalaDoAssistente: c.agentHints.slice(0, 14)
          }))
        }).slice(0, 12000)
      }
    ]
  };

  try {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 28000);
    let res: Response;
    try {
      res = await fetch(`${OPENAI_V1}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body),
        signal: ac.signal
      });
    } finally {
      clearTimeout(to);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      logger.warn(
        `[IntentTriggerSemanticOpenAi] OpenAI HTTP ${res.status}: ${data?.error?.message || "unknown"}`
      );
      return [];
    }
    const content = data?.choices?.[0]?.message?.content;
    const parsed = extractJsonObject(String(content || ""));
    const ids = parsed?.ids;
    if (!Array.isArray(ids)) return [];
    const out = ids
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
      .filter((n, i, arr) => arr.indexOf(n) === i);
    const allowed = new Set(candidates.map((c) => c.id));
    return out.filter((id) => allowed.has(id)).slice(0, 4);
  } catch (e: any) {
    logger.warn(
      `[IntentTriggerSemanticOpenAi] falha na chamada OpenAI: ${e?.message || e}`
    );
    return [];
  }
}
