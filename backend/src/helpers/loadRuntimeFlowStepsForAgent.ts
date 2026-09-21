/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AttendanceFlowStep from "../models/AttendanceFlowStep";
import { compileAttendanceFlowIR } from "./compileAttendanceFlowIR";
import {
  resolveRuntimeAttendanceFlowStepRows,
  type RuntimeAttendanceFlowStepRow
} from "./promptV2Payload";

/**
 * Carrega todas as etapas do roteiro para o motor WhatsApp:
 * banco (AttendanceFlowStep) + attendanceScript + fallback via compilador IR
 * (mesma lógica do save no editor).
 */
export async function loadRuntimeFlowStepsForAgent(params: {
  fullPrompt: {
    attendanceFlowSteps?: Array<Record<string, unknown>> | null;
    attendanceScript?: string | null;
    prompt?: string | null;
  };
  promptId: number;
  companyId: number;
}): Promise<RuntimeAttendanceFlowStepRow[]> {
  const { fullPrompt, promptId, companyId } = params;

  let dbSteps = [...(fullPrompt.attendanceFlowSteps || [])];
  if (!dbSteps.length) {
    try {
      const rows = await AttendanceFlowStep.findAll({
        where: { promptId, companyId },
        order: [["stepNumber", "ASC"]]
      });
      dbSteps = rows.map((r) => r.toJSON() as Record<string, unknown>);
    } catch {
      dbSteps = [];
    }
  }

  let steps = resolveRuntimeAttendanceFlowStepRows({
    attendanceFlowSteps: dbSteps,
    attendanceScript: fullPrompt.attendanceScript,
    prompt: fullPrompt.prompt
  });

  const script = String(fullPrompt.attendanceScript || "").trim();
  if (script) {
    try {
      const compiled = compileAttendanceFlowIR({
        script,
        fallbackAgentPrompt: String(fullPrompt.prompt || "").slice(0, 4000)
      });
      if (compiled.steps.length >= steps.length) {
        steps = compiled.steps.map((s) => ({
          stepNumber: s.stepNumber,
          agentPrompt: s.agentPrompt,
          responseOptions: s.responseOptions || [],
          conditions: s.conditions || [],
          attachments: s.attachments || []
        }));
      }
    } catch {
      /* compilador é best-effort no runtime */
    }
  }

  return steps;
}
