/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Hash determinístico do Step IR + AttendanceFlowDefinition compilados (PR 3 — pré-compreensão).
 *
 * Usado como chave de cache do `flowUnderstanding`: só re-roda a pré-compreensão
 * LLM (ou o fallback determinístico) quando o IR efetivamente mudou.
 *
 * Garantias:
 *  - Estável: mesma entrada → mesmo hash (ordenamos campos antes de stringificar).
 *  - Insensível a campos não relevantes (timestamps, IDs auto-incrementais).
 *  - Curto (SHA-256 hex truncado em 16 chars é mais que suficiente para colisões).
 */

import crypto from "crypto";
import type { CompiledStepIR } from "./compileAttendanceFlowIR";

type IrHashInputStep = Pick<
  CompiledStepIR,
  | "stepId"
  | "stepNumber"
  | "title"
  | "objective"
  | "expectedReply"
  | "slotName"
  | "slotSchema"
  | "agentPrompt"
  | "customerVisibleText"
  | "branchesIR"
  | "commandsIR"
  | "trainingMarkers"
>;

export type IrHashInput = {
  compilerVersion: number;
  entryStepId: string | null;
  fallbackStepId: string | null;
  policy: unknown;
  transitionHooks?: unknown;
  steps: IrHashInputStep[];
};

function stableStringify(value: unknown): string {
  if (value == null) return "null";
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeAttendanceFlowIrHash(input: IrHashInput): string {
  const normalized: IrHashInput = {
    compilerVersion: Number(input.compilerVersion) || 1,
    entryStepId: input.entryStepId || null,
    fallbackStepId: input.fallbackStepId || null,
    policy: input.policy || {},
    transitionHooks: Array.isArray(input.transitionHooks) ? input.transitionHooks : [],
    steps: (input.steps || []).map((s) => ({
      stepId: s.stepId,
      stepNumber: s.stepNumber,
      title: s.title,
      objective: s.objective,
      expectedReply: s.expectedReply,
      slotName: s.slotName,
      slotSchema: s.slotSchema,
      agentPrompt: s.agentPrompt,
      customerVisibleText: s.customerVisibleText,
      branchesIR: s.branchesIR,
      commandsIR: s.commandsIR,
      trainingMarkers: s.trainingMarkers
    }))
  };
  const canonical = stableStringify(normalized);
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
