/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Garante que campos JSON do agente cheguem como objeto (não string dupla / FormData legado).
 */
export function ensureJsonObject(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return {};
    try {
      return JSON.parse(s);
    } catch {
      return value;
    }
  }
  return value;
}

export function ensureJsonArray(value: unknown): unknown {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p;
      if (p && typeof p === "object") return [p];
      return [];
    } catch {
      return [];
    }
  }
  if (typeof value === "object") return [value];
  return [];
}

function parseJsonStringIfPossible(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s) return "";
  try {
    return JSON.parse(s);
  } catch {
    return value;
  }
}

function normalizeConditionsField(raw: unknown): unknown {
  if (raw == null) return [];
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    try {
      return JSON.parse(s);
    } catch {
      return [];
    }
  }
  return raw;
}

/** Normaliza req.body antes de Create/Update Prompt. */
export function normalizePromptPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const body = { ...raw };
  body.cargo = ensureJsonObject(body.cargo);
  body.cerebro = ensureJsonObject(body.cerebro);
  body.produtividade = ensureJsonObject(body.produtividade);
  body.midias = ensureJsonObject(body.midias);
  const steps = ensureJsonArray(body.attendanceFlowSteps) as Record<string, unknown>[];
  body.attendanceFlowSteps = steps.map((step) => {
    if (!step || typeof step !== "object") return step;
    const parsedResponseOptions = ensureJsonArray(step.responseOptions) as unknown[];
    const normalizedResponseOptions = parsedResponseOptions
      .map((item) => parseJsonStringIfPossible(item))
      .filter((item) => item != null);
    return {
      ...step,
      responseOptions: normalizedResponseOptions,
      conditions: normalizeConditionsField(step.conditions)
    };
  });
  return body;
}
