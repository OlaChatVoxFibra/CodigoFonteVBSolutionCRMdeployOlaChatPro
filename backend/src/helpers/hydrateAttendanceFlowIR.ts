/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Hidrata CompiledStepIR + CompiledFlowDefinitionDraft a partir das rows persistidas
 * (`AttendanceFlowStep` + `AttendanceFlowDefinition`). Usado pelo motor v2 em runtime.
 *
 * Quando as colunas IR estiverem vazias (agente antigo, ainda não recompilado), faz
 * compilação ON-THE-FLY a partir do `agentPrompt` cru — o motor v2 não pode quebrar
 * por causa de dados legados.
 */

import type {
  CompiledStepIR,
  CompiledFlowDefinitionDraft,
  StepBranchIR,
  StepCommandIR,
  ExpectedReplyKind,
  StepTrainingMarkers
} from "./compileAttendanceFlowIR";
import { compileAttendanceFlowIR } from "./compileAttendanceFlowIR";

function parseJsonish(value: unknown, fallback: any): any {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      const p = JSON.parse(value);
      return p == null ? fallback : p;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const ALLOWED_REPLY: ExpectedReplyKind[] = [
  "text",
  "choice",
  "date",
  "number",
  "yes_no",
  "open",
  "none"
];

function coerceExpectedReply(v: unknown): ExpectedReplyKind {
  const s = String(v || "").toLowerCase();
  return (ALLOWED_REPLY.includes(s as ExpectedReplyKind) ? s : "text") as ExpectedReplyKind;
}

function coerceBranches(raw: any): StepBranchIR[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((b) => {
      const matcher = String(b?.matcher || "").toLowerCase();
      if (!["choice", "regex", "semantic", "always"].includes(matcher)) return null;
      return {
        matcher: matcher as StepBranchIR["matcher"],
        value: String(b?.value || ""),
        nextStepId:
          b?.nextStepId == null || b?.nextStepId === ""
            ? null
            : String(b.nextStepId),
        label: String(b?.label || "").slice(0, 200)
      } as StepBranchIR;
    })
    .filter((b): b is StepBranchIR => !!b);
}

function coerceCommands(raw: any): StepCommandIR[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((c) => {
      const when = String(c?.when || "").toLowerCase();
      if (!["on_present", "after_reply", "on_enter", "on_exit"].includes(when)) return null;
      return {
        slug: String(c?.slug || "").replace(/^\//, ""),
        smartActionId: c?.smartActionId != null ? Number(c.smartActionId) : null,
        when: when as StepCommandIR["when"],
        deferred: !!c?.deferred,
        kind: c?.kind != null ? String(c.kind) : undefined
      } as StepCommandIR;
    })
    .filter((c): c is StepCommandIR => !!c && !!c.slug);
}

function coerceTraining(raw: any): StepTrainingMarkers {
  const obj = parseJsonish(raw, {});
  return {
    examples: Array.isArray(obj?.examples) ? obj.examples.map((s: any) => String(s)) : [],
    objections: Array.isArray(obj?.objections) ? obj.objections.map((s: any) => String(s)) : []
  };
}

function hasAnyIrColumns(row: any): boolean {
  return (
    row?.expectedReply != null ||
    row?.branchesIR != null ||
    row?.commandsIR != null ||
    row?.customerVisibleText != null
  );
}

function hydrateOneStep(row: any, index: number): CompiledStepIR {
  const stepNumber = Number(row?.stepNumber) || index + 1;
  return {
    stepId: `s${stepNumber}`,
    stepNumber,
    title: String(row?.title || `Etapa ${stepNumber}`),
    objective: String(row?.objective || ""),
    expectedReply: coerceExpectedReply(row?.expectedReply),
    slotName: row?.slotName != null ? String(row.slotName) : null,
    slotSchema: parseJsonish(row?.slotSchema, null),
    agentPrompt: String(row?.agentPrompt || ""),
    customerVisibleText: String(row?.customerVisibleText || row?.agentPrompt || ""),
    trainingMarkers: coerceTraining(row?.trainingMarkers),
    branchesIR: coerceBranches(parseJsonish(row?.branchesIR, [])),
    commandsIR: coerceCommands(parseJsonish(row?.commandsIR, [])),
    responseOptions: parseJsonish(row?.responseOptions, []) || [],
    conditions: parseJsonish(row?.conditions, []) || [],
    attachments: parseJsonish(row?.attachments, []) || []
  };
}

export function hydrateAttendanceFlowIRFromRows(input: {
  stepRows: any[];
  definitionRow?: any | null;
  /** Smart actions disponíveis (vincula commandsIR.smartActionId). */
  smartActions?: Array<{
    id: number;
    slug?: string | null;
    type?: string | null;
    name?: string | null;
  }>;
}): {
  steps: CompiledStepIR[];
  definition: CompiledFlowDefinitionDraft;
  source: "ir" | "on_the_fly";
} {
  const rows = Array.isArray(input.stepRows) ? input.stepRows : [];
  const sorted = [...rows].sort(
    (a, b) => Number(a?.stepNumber || 0) - Number(b?.stepNumber || 0)
  );

  const anyIr = sorted.some(hasAnyIrColumns);
  if (anyIr) {
    const steps = sorted.map((row, idx) => hydrateOneStep(row, idx));
    const def = input.definitionRow || {};
    const definition: CompiledFlowDefinitionDraft = {
      entryStepId: def?.entryStepId != null ? String(def.entryStepId) : steps[0]?.stepId || null,
      fallbackStepId: def?.fallbackStepId != null ? String(def.fallbackStepId) : null,
      policy: parseJsonish(def?.policy, {
        maxTurnsPerStep: 3,
        allowBackJump: true,
        allowCorrection: true,
        strictMode: false,
        semanticSplit: true,
        strictUnderstanding: false
      }),
      compilerVersion: Number(def?.compilerVersion) || 1,
      transitionHooks: Array.isArray(parseJsonish(def?.transitionHooks, []))
        ? (parseJsonish(def?.transitionHooks, []) as unknown[])
        : [],
      lastCompiledAt:
        def?.lastCompiledAt instanceof Date
          ? def.lastCompiledAt.toISOString()
          : String(def?.lastCompiledAt || new Date().toISOString())
    };
    return { steps, definition, source: "ir" };
  }

  /** Fallback: nenhum dado IR — recompila on-the-fly. */
  const scriptParts = sorted
    .map((row) => String(row?.agentPrompt || "").trim())
    .filter(Boolean);
  const script = scriptParts.join("\n---\n");
  const compiled = compileAttendanceFlowIR({
    script,
    smartActions: (input.smartActions || []).map((a) => ({
      id: Number(a.id),
      slug: a.slug || undefined,
      type: a.type || undefined,
      name: a.name || undefined
    }))
  });
  return {
    steps: compiled.steps,
    definition: compiled.definition,
    source: "on_the_fly"
  };
}
