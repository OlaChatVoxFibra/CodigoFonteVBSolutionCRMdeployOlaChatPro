/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * IDs padrão para o runtime OpenAI.
 * Ajuste no .env se a conta não tiver acesso ao modelo escolhido.
 * Catálogo: https://platform.openai.com/docs/models
 */
export const OPENAI_DEFAULT_CHAT_MODEL =
  (typeof process !== "undefined" && process.env.OPENAI_DEFAULT_CHAT_MODEL?.trim()) ||
  "gpt-5.5";

/** Chamadas curtas (classificador, checagem de objetivo SIM/NÃO, etc.). */
export const OPENAI_DEFAULT_FAST_MODEL =
  (typeof process !== "undefined" && process.env.OPENAI_DEFAULT_FAST_MODEL?.trim()) ||
  "gpt-5.4-mini";

function readBoundedInt(name: string, def: number, min: number, max: number): number {
  if (typeof process === "undefined") return def;
  const raw = process.env[name]?.trim();
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(Math.floor(n), max));
}

/** Tamanho-alvo por bolha ao partir a reply do agente no WhatsApp (caracteres). */
export const AGENT_OUTBOUND_BUBBLE_MAX_CHARS = readBoundedInt(
  "AGENT_OUTBOUND_BUBBLE_MAX_CHARS",
  450,
  220,
  900
);

/** Pausa entre bolhas consecutivas (ms) para leitura natural no cliente. */
export const AGENT_OUTBOUND_BUBBLE_DELAY_MS = readBoundedInt(
  "AGENT_OUTBOUND_BUBBLE_DELAY_MS",
  420,
  120,
  2500
);
