/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const KINDS = new Set(["image", "audio", "document", "file"]);

const OWNER_META_KEY = "_agentPromptId";

/** Garante array JSON seguro para colunas json (evita string dupla / objeto solto que quebra o Postgres). */
function coerceJsonArray(raw: unknown): any[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const s = raw.trim();
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
  if (typeof raw === "object") return [];
  return [];
}

function toSafeJsonValue<T>(raw: unknown, fallback: T): T {
  try {
    return JSON.parse(JSON.stringify(raw)) as T;
  } catch {
    return fallback;
  }
}

function sanitizeResponseOption(o: any, index: number): Record<string, unknown> | null {
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const nextRaw = o.nextStep;
  let nextStep: number | null = null;
  if (nextRaw !== undefined && nextRaw !== null && nextRaw !== "") {
    const n = Number(nextRaw);
    if (Number.isFinite(n)) nextStep = Math.trunc(n);
  }
  return {
    id: o.id != null ? String(o.id) : `opt_${index}`,
    text: o.text != null ? String(o.text) : "",
    nextStep,
    matchMode: o.matchMode && String(o.matchMode) ? String(o.matchMode) : "flex",
    postAction: o.postAction != null ? String(o.postAction) : ""
  };
}

function normalizeConditionsRaw(raw: unknown): unknown {
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

/**
 * Campos persistíveis de um passo do fluxo (sem id temporário do front).
 * @param agentPromptId quando informado, grava metadado defensivo no JSON `conditions`.
 */
export function pickAttendanceFlowStepRow(
  step: any,
  agentPromptId?: number
): {
  stepNumber: number;
  agentPrompt: string;
  responseOptions: any;
  conditions: any;
  attachments: any[];
} {
  const attachments = Array.isArray(step?.attachments)
    ? step.attachments
        .filter((a: any) => a && String(a.url || "").trim())
        .map((a: any) => ({
          url: String(a.url).trim(),
          kind: KINDS.has(String(a.kind)) ? a.kind : "file",
          originalName: String(a.originalName || "").slice(0, 512) || undefined,
          mimeType: String(a.mimeType || "").slice(0, 160) || undefined,
          size: typeof a.size === "number" && a.size >= 0 ? Math.floor(a.size) : undefined
        }))
    : [];

  /**
   * conditions no front costuma ser array; não substituir por objeto só com _agentPromptId
   * (isso apagava todas as condições e quebrava etapas seguintes no fluxo).
   */
  let conditions: any = normalizeConditionsRaw(step?.conditions);
  if (agentPromptId != null && Number.isFinite(Number(agentPromptId))) {
    if (Array.isArray(conditions)) {
      conditions = conditions.map((item) =>
        item && typeof item === "object" ? { ...item } : item
      );
    } else if (conditions && typeof conditions === "object") {
      conditions = { ...conditions, [OWNER_META_KEY]: Number(agentPromptId) };
    } else {
      conditions = { [OWNER_META_KEY]: Number(agentPromptId) };
    }
  }

  const responseOptions = coerceJsonArray(step?.responseOptions)
    .map((o, i) => sanitizeResponseOption(o, i))
    .filter((x): x is Record<string, unknown> => x != null);

  return {
    stepNumber: Number(step?.stepNumber) || 0,
    agentPrompt: String(step?.agentPrompt ?? step?.agent_prompt ?? ""),
    responseOptions: toSafeJsonValue<any[]>(responseOptions, []),
    conditions: toSafeJsonValue<any>(conditions, []),
    attachments: toSafeJsonValue<any[]>(attachments, [])
  };
}
