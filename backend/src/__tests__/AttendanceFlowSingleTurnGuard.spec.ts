/**
 * Tests do AttendanceFlowSingleTurnGuard (PR 6).
 */
import {
  buildSingleStepSystemPrompt,
  postGenerationGuard
} from "../services/PromptServices/AttendanceFlowSingleTurnGuard";
import type { CompiledStepIR } from "../helpers/compileAttendanceFlowIR";
import type { FlowUnderstanding } from "../services/PromptServices/AttendanceFlowUnderstandingService";

function makeStep(): CompiledStepIR {
  return {
    stepId: "s2",
    stepNumber: 2,
    title: "Coletar data",
    objective: "Saber a data preferida do cliente.",
    expectedReply: "date",
    slotName: "preferredDate",
    slotSchema: null,
    agentPrompt: "Para qual data você quer agendar?",
    customerVisibleText: "Para qual data você quer agendar?",
    trainingMarkers: { examples: ["dia 21/05"], objections: [] },
    branchesIR: [
      { matcher: "always", value: "any", nextStepId: "s3", label: "linear" }
    ],
    commandsIR: [],
    responseOptions: [],
    conditions: [],
    attachments: []
  } as CompiledStepIR;
}

function makeUnderstanding(): FlowUnderstanding {
  return {
    schemaVersion: 1,
    globalObjective: "Agendar visita do cliente.",
    audience: "Lead morno",
    stepMap: [
      {
        stepId: "s2",
        stepNumber: 2,
        title: "Coletar data",
        objective: "Saber a data preferida",
        expectedSlot: "preferredDate",
        askedQuestion: "Para qual data você quer agendar?",
        successCriteria: "Captou data válida",
        typicalReplies: ["dia 21/05", "amanhã às 10h"],
        forwardLeads: [{ to: "s3", on: "fluxo linear" }]
      }
    ],
    slotsExpected: [],
    transitionTriggers: [],
    terminalStates: ["end"],
    risksDetected: [],
    confidence: 0.9,
    source: "fallback",
    generatedAt: new Date().toISOString(),
    irHash: "abcdef0123456789"
  } as FlowUnderstanding;
}

describe("buildSingleStepSystemPrompt", () => {
  it("includes hard rules and canonical step text", () => {
    const prompt = buildSingleStepSystemPrompt({
      step: makeStep(),
      understanding: makeUnderstanding()
    });
    expect(prompt).toMatch(/PASSO A PASSO/);
    expect(prompt).toMatch(/Para qual data você quer agendar/);
    expect(prompt).toMatch(/REGRAS RÍGIDAS/);
    expect(prompt).toMatch(/FAQ|conhecimento/i);
    expect(prompt).toMatch(/Etapa 2|próxima etapa|NÃO/);
  });

  it("falls back when understanding is missing", () => {
    const prompt = buildSingleStepSystemPrompt({ step: makeStep() });
    expect(prompt).toMatch(/Conduzir o cliente|Objetivo global/);
    expect(prompt).toMatch(/Coletar data/);
  });
});

describe("postGenerationGuard — truncations", () => {
  it("clips at first section divider", () => {
    const out = postGenerationGuard(
      "Perfeito, anotei dia 21/05.\n\n---\n\n# ETAPA 3\nQuantas pessoas vão?",
      { step: makeStep() }
    );
    expect(out.truncated).toBe(true);
    expect(out.reasons).toContain("section_divider");
    expect(out.text).toMatch(/^Perfeito/);
    expect(out.text).not.toMatch(/Quantas pessoas/);
  });

  it("clips at second # ETAPA header", () => {
    const out = postGenerationGuard(
      "# ETAPA 2\nOlá!\n\n# ETAPA 3\nQuantas pessoas?",
      { step: makeStep() }
    );
    expect(out.truncated).toBe(true);
    expect(out.reasons).toContain("step_header_burst");
    expect(out.text).not.toMatch(/Quantas pessoas/);
  });

  it("removes a single # ETAPA line when present alone", () => {
    const out = postGenerationGuard("# ETAPA 2\nPara qual data?", { step: makeStep() });
    expect(out.reasons).toContain("step_header_burst");
    expect(out.text).not.toMatch(/# ETAPA/);
  });

  it("clips at second separate question", () => {
    const out = postGenerationGuard(
      "Quer agendar agora?\n\nE quantas pessoas vão? E qual o horário?",
      { step: makeStep() }
    );
    expect(out.truncated).toBe(true);
    expect(out.reasons).toContain("second_question_burst");
    expect(out.text).toBe("Quer agendar agora?");
  });

  it("removes echo of previous step text", () => {
    const out = postGenerationGuard(
      "Você quer agendar agora ou daqui a pouco? Para qual data você prefere?",
      {
        step: makeStep(),
        previousStepVisibleText: "Você quer agendar agora ou daqui a pouco?"
      }
    );
    expect(out.reasons).toContain("previous_step_echo");
    expect(out.text).toMatch(/Para qual data/);
    expect(out.text).not.toMatch(/agendar agora ou daqui a pouco/);
  });

  it("enforces 1200 char hard limit", () => {
    const long = "x ".repeat(1500);
    const out = postGenerationGuard(long, { step: makeStep() });
    expect(out.text.length).toBeLessThanOrEqual(1200);
    expect(out.reasons).toContain("max_length");
  });

  it("keeps short clean text untouched", () => {
    const out = postGenerationGuard("Perfeito, anotei.", { step: makeStep() });
    expect(out.truncated).toBe(false);
    expect(out.reasons).toEqual([]);
    expect(out.text).toBe("Perfeito, anotei.");
  });
});
