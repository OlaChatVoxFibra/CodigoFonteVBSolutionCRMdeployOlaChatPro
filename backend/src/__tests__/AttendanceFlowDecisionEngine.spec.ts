/**
 * Tests do AttendanceFlowDecisionEngine (PR 5).
 * 100% puro — sem mocks de DB/IO.
 */
import {
  decideAttendanceFlowTurn,
  isFlowEngineV2Enabled,
  type FlowDecisionInput
} from "../services/PromptServices/AttendanceFlowDecisionEngine";
import { compileAttendanceFlowIR } from "../helpers/compileAttendanceFlowIR";
import type { AttendanceFlowMemory } from "../helpers/agentAttendanceFlowMemory";
import type {
  ClassifierResult,
  ClassifierIntent
} from "../services/PromptServices/AttendanceFlowClassifierService";

function compileSample() {
  return compileAttendanceFlowIR({
    script: [
      "# ETAPA 1 — Abertura",
      "Você quer agendar agora ou daqui a pouco?",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      "agendar agora",
      "RESPOSTA:",
      "Perfeito.",
      "---",
      "# ETAPA 2 — Data",
      "Para qual data?",
      "---",
      "# ETAPA 3 — Pessoas",
      "Quantas pessoas vão?",
      "---",
      "# ETAPA 4 — Confirma",
      "Posso confirmar (sim/não)?",
      "/agendamento"
    ].join("\n"),
    smartActions: [
      { id: 5, slug: "agendamento", type: "agendamento", name: "Agendar" }
    ]
  });
}

function makeMemory(overrides: Partial<AttendanceFlowMemory> = {}): AttendanceFlowMemory {
  return {
    promptId: 1,
    lastPresentedStep: 2,
    lastHandledUserWid: "",
    flowPhase: "active",
    awaitingUserReply: true,
    answersByStep: { "1": "agendar agora" },
    completedSteps: [1],
    deferredScriptActions: {},
    executedScriptCommands: {},
    ...overrides
  } as AttendanceFlowMemory;
}

function makeClassifier(
  intent: ClassifierIntent,
  overrides: Partial<ClassifierResult> = {}
): ClassifierResult {
  return {
    schemaVersion: 1,
    intent,
    targetStepId: "s2",
    matchedBranch: null,
    filledSlot: null,
    correctionTarget: null,
    confidence: 0.9,
    reasoning: "test",
    source: "fallback",
    ...overrides
  };
}

function makeInput(
  intent: ClassifierIntent,
  opts: {
    memory?: Partial<AttendanceFlowMemory>;
    classifier?: Partial<ClassifierResult>;
    currentStepNumber?: number;
    userText?: string;
  } = {}
): FlowDecisionInput {
  const { steps, definition } = compileSample();
  return {
    memory: makeMemory(opts.memory),
    classifier: makeClassifier(intent, opts.classifier),
    steps,
    definition,
    currentStepNumber: opts.currentStepNumber ?? 2,
    userText: opts.userText
  };
}

describe("decideAttendanceFlowTurn — onboarding", () => {
  it("presents entry step when currentStepNumber=0", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("noise", {
        memory: { lastPresentedStep: 0, awaitingUserReply: false, completedSteps: [] },
        currentStepNumber: 0
      })
    );
    expect(d.action).toBe("present_step");
    expect(d.presentStep?.stepNumber).toBe(1);
    expect(d.memoryPatch.flowPhase).toBe("active");
    expect(d.hookFires.map((h) => h.moment)).toEqual(["on_enter", "on_present"]);
    expect(d.consumedReply).toBe(true);
  });
});

describe("decideAttendanceFlowTurn — advance", () => {
  it("advances linearly from step 2 to step 3 with slot recorded", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("advance", {
        classifier: {
          filledSlot: {
            name: "preferredDate",
            type: "date",
            value: "2026-05-21T00:00:00.000Z",
            rawText: "dia 21/05"
          }
        },
        currentStepNumber: 2,
        userText: "dia 21/05"
      })
    );
    expect(d.action).toBe("present_step");
    expect(d.presentStep?.stepNumber).toBe(3);
    expect(d.memoryPatch.answersByStep?.["2"]).toBe("dia 21/05");
    expect(d.memoryPatch.completedSteps).toEqual([1, 2]);
    expect(d.hookFires.map((h) => h.moment)).toEqual([
      "after_reply",
      "on_transition",
      "on_enter",
      "on_present"
    ]);
    expect(d.consumedReply).toBe(true);
  });

  it("respects classifier.matchedBranch.nextStepId over linear", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("advance", {
        currentStepNumber: 1,
        classifier: {
          matchedBranch: { matcher: "semantic", label: "agendar agora", nextStepId: "s4" }
        },
        userText: "agendar agora"
      })
    );
    expect(d.action).toBe("present_step");
    expect(d.presentStep?.stepNumber).toBe(4);
  });

  it("completes flow when current is terminal (step 4 → no linear next)", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("advance", {
        memory: { lastPresentedStep: 4, completedSteps: [1, 2, 3] },
        currentStepNumber: 4,
        userText: "sim"
      })
    );
    expect(d.action).toBe("complete_flow");
    expect(d.memoryPatch.flowPhase).toBe("completed");
    expect(d.hookFires.map((h) => h.moment)).toEqual([
      "after_reply",
      "on_exit",
      "on_flow_complete"
    ]);
  });

  it("NO REPEAT: noop when next would be the same active step (awaiting)", () => {
    /** Forço cenário onde matchedBranch aponta de volta para o step atual. */
    const d = decideAttendanceFlowTurn(
      makeInput("advance", {
        currentStepNumber: 2,
        classifier: {
          matchedBranch: { matcher: "regex", label: "loop", nextStepId: "s2" }
        }
      })
    );
    expect(d.action).toBe("noop");
    expect(d.hookFires[0]?.moment).toBe("after_reply");
  });
});

describe("decideAttendanceFlowTurn — correction", () => {
  it("rolls back to correctionTarget and clears answers from there", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("correction", {
        memory: {
          lastPresentedStep: 3,
          completedSteps: [1, 2],
          answersByStep: { "1": "agendar agora", "2": "dia 20/05" }
        },
        classifier: { correctionTarget: "s2" },
        currentStepNumber: 3,
        userText: "ah, errado, é dia 21"
      })
    );
    expect(d.action).toBe("present_step");
    expect(d.presentStep?.stepNumber).toBe(2);
    expect(d.memoryPatch.answersByStep).toEqual({ "1": "agendar agora" });
    expect(d.memoryPatch.completedSteps).toEqual([1]);
    expect(d.hookFires[0]?.moment).toBe("on_correction");
    expect(d.hookFires[0]?.corrected).toBe(true);
  });

  it("sends hint when correctionTarget is unidentifiable", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("correction", {
        currentStepNumber: 1,
        memory: { lastPresentedStep: 1 },
        classifier: { correctionTarget: null }
      })
    );
    expect(d.action).toBe("send_hint");
    expect(d.hintText).toMatch(/refazer|qual informação/i);
  });
});

describe("decideAttendanceFlowTurn — guard intents", () => {
  it("noise → noop, consumedReply=false (não pula LLM)", () => {
    const d = decideAttendanceFlowTurn(makeInput("noise"));
    expect(d.action).toBe("noop");
    expect(d.consumedReply).toBe(false);
    expect(d.hookFires).toHaveLength(0);
  });

  it("repeat → send_hint com o texto da etapa", () => {
    const d = decideAttendanceFlowTurn(makeInput("repeat"));
    expect(d.action).toBe("send_hint");
    expect(d.hintText && d.hintText.length).toBeGreaterThan(0);
    expect(d.consumedReply).toBe(true);
  });

  it("off_topic → defer_to_llm sem consumir turno", () => {
    const d = decideAttendanceFlowTurn(makeInput("off_topic"));
    expect(d.action).toBe("defer_to_llm");
    expect(d.hintText).toBeNull();
    expect(d.consumedReply).toBe(false);
  });

  it("terminate → complete_flow com on_exit + on_flow_complete", () => {
    const d = decideAttendanceFlowTurn(makeInput("terminate"));
    expect(d.action).toBe("complete_flow");
    expect(d.memoryPatch.flowPhase).toBe("completed");
    expect(d.hookFires.map((h) => h.moment)).toEqual(["on_exit", "on_flow_complete"]);
  });
});

describe("decideAttendanceFlowTurn — completed phase ignora tudo", () => {
  it("returns noop when phase=completed", () => {
    const d = decideAttendanceFlowTurn(
      makeInput("advance", {
        memory: { flowPhase: "completed", lastPresentedStep: 4 },
        currentStepNumber: 4
      })
    );
    expect(d.action).toBe("noop");
    expect(d.consumedReply).toBe(false);
  });
});

describe("isFlowEngineV2Enabled", () => {
  const oldEnv = process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED;
  afterEach(() => {
    if (oldEnv === undefined) delete process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED;
    else process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED = oldEnv;
  });

  it("false by default", () => {
    delete process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED;
    expect(isFlowEngineV2Enabled()).toBe(false);
  });

  it("true for 'true'/'1'/'on'", () => {
    for (const v of ["true", "1", "on", "yes"]) {
      process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED = v;
      expect(isFlowEngineV2Enabled()).toBe(true);
    }
  });
});
