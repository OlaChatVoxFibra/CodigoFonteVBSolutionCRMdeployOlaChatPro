/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../utils/logger";

/** Chave persistida nos JSON cargo/cérebro/produtividade do Prompt para auditoria e validação. */
export const PROMPT_JSON_OWNER_KEY = "promptId";

function normalizeJsonObject(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, any>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

function attachOwnerToSingleBlob(promptId: number, raw: unknown): unknown {
  const o = normalizeJsonObject(raw);
  if (!Object.keys(o).length) return raw ?? o;
  return { ...o, [PROMPT_JSON_OWNER_KEY]: Number(promptId) };
}

/** Injeta `promptId` nos blobs ao salvar o agente (Create/Update Prompt). */
export function attachPromptOwnerToPromptRow(
  promptId: number,
  row: { cargo?: unknown; cerebro?: unknown; produtividade?: unknown }
): { cargo: unknown; cerebro: unknown; produtividade: unknown } {
  return {
    cargo: attachOwnerToSingleBlob(promptId, row.cargo),
    cerebro: attachOwnerToSingleBlob(promptId, row.cerebro),
    produtividade: attachOwnerToSingleBlob(promptId, row.produtividade)
  };
}

type LogFn = (msg: string, meta?: Record<string, unknown>) => void;

/**
 * Valida dono dos subdocumentos em runtime. Legado sem `promptId`: aceita e registra aviso leve.
 * `promptId` divergente: ignora o blob (fail-safe).
 */
export function resolveOwnedPromptBlobsForRuntime(
  promptId: number,
  cargo: unknown,
  cerebro: unknown,
  produtividade: unknown,
  log: LogFn = (m, meta) => {
    try {
      logger.warn(m, meta);
    } catch {
      /* ignore */
    }
  }
): {
  cargo: Record<string, any>;
  cerebro: Record<string, any>;
  produtividade: Record<string, any>;
} {
  const check = (raw: unknown, label: string): Record<string, any> => {
    const o = normalizeJsonObject(raw);
    if (!Object.keys(o).length) return o;
    const pid = o[PROMPT_JSON_OWNER_KEY];
    if (pid === undefined || pid === null) {
      log(`[prompt-owner] ${label} sem ${PROMPT_JSON_OWNER_KEY} (legado); usando conteúdo`, {
        promptId,
        label
      });
      return o;
    }
    if (Number(pid) !== Number(promptId)) {
      log(`[prompt-owner] ${label} com ${PROMPT_JSON_OWNER_KEY} divergente; blob ignorado`, {
        promptId,
        blobPromptId: pid,
        label
      });
      return {};
    }
    return o;
  };

  return {
    cargo: check(cargo, "cargo"),
    cerebro: check(cerebro, "cerebro"),
    produtividade: check(produtividade, "produtividade")
  };
}

export type PromptBlobField = "cargo" | "cerebro" | "produtividade";

export type PromptBlobAuditStatus = "ok" | "empty" | "legacy_no_owner" | "mismatch";

/** Somente leitura / auditoria (scripts): estado do campo `promptId` dentro do blob. */
export function auditPromptBlobField(promptRowId: number, raw: unknown): PromptBlobAuditStatus {
  const o = normalizeJsonObject(raw);
  if (!Object.keys(o).length) return "empty";
  const pid = o[PROMPT_JSON_OWNER_KEY];
  if (pid === undefined || pid === null) return "legacy_no_owner";
  if (Number(pid) !== Number(promptRowId)) return "mismatch";
  return "ok";
}
