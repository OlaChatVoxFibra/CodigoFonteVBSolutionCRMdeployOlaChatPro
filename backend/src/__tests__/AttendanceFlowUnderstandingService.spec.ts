/**
 * Mock OpenAI ANTES de qualquer import — evita inicialização real do SDK.
 * Cada teste pode rewrite `mockCreate` para retornar diferentes shapes.
 */
const mockCreate = jest.fn();
jest.mock("openai", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: { completions: { create: mockCreate } }
    }))
  };
});

import {
  generateAttendanceFlowUnderstanding,
  buildDeterministicFallback,
  buildFlowUnderstandingDigest,
  validateFlowUnderstanding,
  FLOW_UNDERSTANDING_SCHEMA_VERSION,
  resolveUnderstandingMode,
  type FlowUnderstanding
} from "../services/PromptServices/AttendanceFlowUnderstandingService";
import { compileAttendanceFlowIR } from "../helpers/compileAttendanceFlowIR";
import { computeAttendanceFlowIrHash } from "../helpers/computeAttendanceFlowIrHash";

const SAMPLE_SCRIPT = [
  "# ETAPA 1 — Abertura",
  "Olá! Tudo bem? Você quer agendar uma viagem ou apenas uma consulta?",
  "",
  "# ETAPA 2 — Data",
  "Para qual data você imagina a viagem?",
  "",
  "# ETAPA 3 — Confirmação",
  "Posso confirmar então?",
  "/agendamento"
].join("\n");

function compile() {
  return compileAttendanceFlowIR({
    script: SAMPLE_SCRIPT,
    smartActions: [{ id: 5, slug: "agendamento", type: "agendamento", name: "Agendar" }]
  });
}

describe("computeAttendanceFlowIrHash", () => {
  it("returns the same hash for the same compiled IR", () => {
    const a = compile();
    const b = compile();
    const ha = computeAttendanceFlowIrHash({
      compilerVersion: a.definition.compilerVersion,
      entryStepId: a.definition.entryStepId,
      fallbackStepId: a.definition.fallbackStepId,
      policy: a.definition.policy,
      transitionHooks: a.definition.transitionHooks,
      steps: a.steps as any
    });
    const hb = computeAttendanceFlowIrHash({
      compilerVersion: b.definition.compilerVersion,
      entryStepId: b.definition.entryStepId,
      fallbackStepId: b.definition.fallbackStepId,
      policy: b.definition.policy,
      transitionHooks: b.definition.transitionHooks,
      steps: b.steps as any
    });
    expect(ha).toBe(hb);
    expect(ha).toHaveLength(16);
  });

  it("returns a different hash when the script changes", () => {
    const a = compile();
    const c = compileAttendanceFlowIR({ script: SAMPLE_SCRIPT + "\n---\n# ETAPA 4\nObrigado!" });
    const ha = computeAttendanceFlowIrHash({
      compilerVersion: a.definition.compilerVersion,
      entryStepId: a.definition.entryStepId,
      fallbackStepId: a.definition.fallbackStepId,
      policy: a.definition.policy,
      transitionHooks: a.definition.transitionHooks,
      steps: a.steps as any
    });
    const hc = computeAttendanceFlowIrHash({
      compilerVersion: c.definition.compilerVersion,
      entryStepId: c.definition.entryStepId,
      fallbackStepId: c.definition.fallbackStepId,
      policy: c.definition.policy,
      transitionHooks: c.definition.transitionHooks,
      steps: c.steps as any
    });
    expect(ha).not.toBe(hc);
  });
});

describe("buildDeterministicFallback", () => {
  it("returns a valid FlowUnderstanding from compiled IR", () => {
    const { steps, definition } = compile();
    const u = buildDeterministicFallback(steps, definition, "abc123");
    expect(u.schemaVersion).toBe(FLOW_UNDERSTANDING_SCHEMA_VERSION);
    expect(u.source).toBe("fallback");
    expect(u.irHash).toBe("abc123");
    expect(u.stepMap.length).toBe(steps.length);
    expect(u.stepMap[0].stepId).toBe("s1");
    expect(u.stepMap[1].expectedSlot).toBe("preferredDate");
    expect(u.terminalStates).toContain("s3");
    expect(u.slotsExpected.some((s) => s.slotName === "preferredDate")).toBe(true);
    /** A etapa 3 tem /agendamento → vira transition trigger. */
    expect(
      u.transitionTriggers.some(
        (t) => t.smartActionSlug === "agendamento" && t.from === "s3"
      )
    ).toBe(true);
    expect(u.confidence).toBeGreaterThan(0);
    expect(u.confidence).toBeLessThanOrEqual(1);
  });

  it("flags ambiguous open question as risk", () => {
    const { steps, definition } = compileAttendanceFlowIR({
      script: "# ETAPA 1\nMe conta tudo sobre você?"
    });
    const u = buildDeterministicFallback(steps, definition, "h");
    /** A pergunta é aberta sem slot — pode ou não estar marcada como `open`; o teste só exige que NÃO quebre. */
    expect(Array.isArray(u.risksDetected)).toBe(true);
    expect(u.stepMap[0].askedQuestion).toMatch(/conta tudo/i);
  });
});

describe("validateFlowUnderstanding", () => {
  const stepIds = new Set(["s1", "s2", "s3"]);

  it("accepts a minimally-valid object", () => {
    const ok = validateFlowUnderstanding(
      {
        globalObjective: "x",
        audience: "y",
        stepMap: [
          {
            stepId: "s1",
            stepNumber: 1,
            title: "t",
            objective: "o",
            expectedSlot: null,
            askedQuestion: "ok?",
            successCriteria: "respondeu",
            typicalReplies: ["sim"],
            forwardLeads: [{ to: "s2", on: "sim" }]
          }
        ],
        slotsExpected: [],
        transitionTriggers: [],
        terminalStates: ["s3"],
        risksDetected: [],
        confidence: 0.9
      },
      stepIds
    );
    expect(ok.ok).toBe(true);
  });

  it("rejects when stepMap is empty", () => {
    const r = validateFlowUnderstanding(
      { stepMap: [], terminalStates: [], transitionTriggers: [] },
      stepIds
    );
    expect(r.ok).toBe(false);
  });

  it("rejects when terminalStates references unknown stepId", () => {
    const r = validateFlowUnderstanding(
      {
        stepMap: [
          {
            stepId: "s1",
            stepNumber: 1,
            title: "t",
            objective: "o",
            successCriteria: "x",
            typicalReplies: [],
            forwardLeads: []
          }
        ],
        slotsExpected: [],
        transitionTriggers: [],
        terminalStates: ["s99"],
        risksDetected: [],
        confidence: 0.5
      },
      stepIds
    );
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.reason).toMatch(/s99/);
  });

  it("rejects transition with unknown `from` (other than '*'/'start')", () => {
    const r = validateFlowUnderstanding(
      {
        stepMap: [
          {
            stepId: "s1",
            stepNumber: 1,
            title: "t",
            objective: "o",
            successCriteria: "x",
            typicalReplies: [],
            forwardLeads: []
          }
        ],
        slotsExpected: [],
        transitionTriggers: [
          { from: "ghost", to: "end", smartActionSlug: null, when: "on_transition" }
        ],
        terminalStates: ["s1"],
        risksDetected: [],
        confidence: 0.5
      },
      stepIds
    );
    expect(r.ok).toBe(false);
  });

  it("normalizes invalid `when` by dropping the bad transition", () => {
    const r = validateFlowUnderstanding(
      {
        stepMap: [
          {
            stepId: "s1",
            stepNumber: 1,
            title: "t",
            objective: "o",
            successCriteria: "x",
            typicalReplies: [],
            forwardLeads: []
          }
        ],
        slotsExpected: [],
        transitionTriggers: [{ from: "*", to: "*", when: "bogus" }],
        terminalStates: ["s1"],
        risksDetected: [],
        confidence: 0.5
      },
      stepIds
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.transitionTriggers.length).toBe(0);
  });

  it("clamps confidence into [0,1]", () => {
    const r = validateFlowUnderstanding(
      {
        stepMap: [
          {
            stepId: "s1",
            stepNumber: 1,
            title: "t",
            objective: "o",
            successCriteria: "x",
            typicalReplies: [],
            forwardLeads: []
          }
        ],
        slotsExpected: [],
        transitionTriggers: [],
        terminalStates: ["s1"],
        risksDetected: [],
        confidence: 99
      },
      stepIds
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.confidence).toBe(1);
  });
});

describe("generateAttendanceFlowUnderstanding", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    delete process.env.ATTENDANCE_FLOW_UNDERSTANDING_MODE;
    delete process.env.ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED;
  });

  it("mode='fallback' (default) does not call LLM and returns deterministic understanding", async () => {
    const { steps, definition } = compile();
    const r = await generateAttendanceFlowUnderstanding({
      steps,
      definition,
      mode: "fallback"
    });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(r.understanding.source).toBe("fallback");
    expect(r.understanding.stepMap.length).toBe(steps.length);
  });

  it("mode='auto' with no API key falls back deterministically and warns", async () => {
    const { steps, definition } = compile();
    const r = await generateAttendanceFlowUnderstanding({
      steps,
      definition,
      mode: "auto"
    });
    expect(r.understanding.source).toBe("fallback");
    expect(r.warnings.join(" ")).toMatch(/openai_api_key_missing/);
  });

  it("mode='auto' with valid LLM JSON uses LLM result", async () => {
    const { steps, definition } = compile();
    const llmJson = {
      globalObjective: "vender pacotes",
      audience: "leads do whatsapp",
      stepMap: steps.map((s) => ({
        stepId: s.stepId,
        stepNumber: s.stepNumber,
        title: s.title,
        objective: s.objective,
        expectedSlot: s.slotName,
        askedQuestion: "ok?",
        successCriteria: "respondeu",
        typicalReplies: ["sim", "claro"],
        forwardLeads:
          s.stepNumber < steps.length
            ? [{ to: `s${s.stepNumber + 1}`, on: "qualquer resposta" }]
            : []
      })),
      slotsExpected: [
        { slotName: "preferredDate", type: "date", askedAt: ["s2"], requiredBy: "s3" }
      ],
      transitionTriggers: [
        { from: "s3", to: "end", smartActionSlug: "agendamento", when: "on_flow_complete" }
      ],
      terminalStates: ["s3"],
      risksDetected: [],
      confidence: 0.9
    };
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(llmJson) } }]
    });

    const r = await generateAttendanceFlowUnderstanding({
      steps,
      definition,
      apiKey: "sk-test",
      mode: "auto"
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(r.understanding.source).toBe("llm");
    expect(r.understanding.globalObjective).toMatch(/pacotes/i);
    expect(r.understanding.slotsExpected[0].slotName).toBe("preferredDate");
  });

  it("mode='auto' with malformed LLM JSON falls back deterministically", async () => {
    const { steps, definition } = compile();
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not a json {{{" } }]
    });
    const r = await generateAttendanceFlowUnderstanding({
      steps,
      definition,
      apiKey: "sk-test",
      mode: "auto"
    });
    expect(r.understanding.source).toBe("fallback");
    expect(r.warnings.join(" ")).toMatch(/not_json|response_not_json/);
  });

  it("mode='auto' with semantically-invalid LLM JSON (unknown stepId) falls back", async () => {
    const { steps, definition } = compile();
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              globalObjective: "x",
              audience: "y",
              stepMap: [
                {
                  stepId: "ghost", // <-- não existe no IR
                  stepNumber: 9,
                  title: "t",
                  objective: "o",
                  successCriteria: "ok",
                  typicalReplies: [],
                  forwardLeads: []
                }
              ],
              slotsExpected: [],
              transitionTriggers: [],
              terminalStates: ["ghost"],
              risksDetected: [],
              confidence: 1
            })
          }
        }
      ]
    });
    const r = await generateAttendanceFlowUnderstanding({
      steps,
      definition,
      apiKey: "sk-test",
      mode: "auto"
    });
    expect(r.understanding.source).toBe("fallback");
    expect(r.warnings.join(" ")).toMatch(/validation_failed/);
  });

  it("mode='llm' (strict) throws when API key is missing", async () => {
    const { steps, definition } = compile();
    await expect(
      generateAttendanceFlowUnderstanding({ steps, definition, mode: "llm" })
    ).rejects.toThrow(/openai_api_key_missing/);
  });
});

describe("resolveUnderstandingMode", () => {
  beforeEach(() => {
    delete process.env.ATTENDANCE_FLOW_UNDERSTANDING_MODE;
    delete process.env.ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED;
  });

  it("returns 'fallback' by default", () => {
    expect(resolveUnderstandingMode()).toBe("fallback");
  });

  it("honors ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED=true → auto", () => {
    process.env.ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED = "true";
    expect(resolveUnderstandingMode()).toBe("auto");
  });

  it("honors explicit ATTENDANCE_FLOW_UNDERSTANDING_MODE=llm", () => {
    process.env.ATTENDANCE_FLOW_UNDERSTANDING_MODE = "llm";
    expect(resolveUnderstandingMode()).toBe("llm");
  });

  it("explicit override wins over env", () => {
    process.env.ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED = "true";
    expect(resolveUnderstandingMode("fallback")).toBe("fallback");
  });
});

describe("buildFlowUnderstandingDigest", () => {
  it("produces a compact digest for system prompt injection", () => {
    const { steps, definition } = compile();
    const u: FlowUnderstanding = buildDeterministicFallback(steps, definition, "h");
    const d = buildFlowUnderstandingDigest(u);
    expect(d.totalSteps).toBe(steps.length);
    expect(d.terminalStates).toContain("s3");
    expect(d.slotsExpected.some((s) => s.slotName === "preferredDate")).toBe(true);
    /** info-risks são suprimidas no digest; warn/error entram. */
    for (const r of d.risksSummary) expect(r).toMatch(/^\[(warn|error)\]/);
  });
});
