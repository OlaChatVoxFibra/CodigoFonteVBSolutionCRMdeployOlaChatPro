/**
 * Mock OpenAI antes de qualquer import — evita inicialização real do SDK.
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
  classifyAttendanceFlowTurn,
  applyHeuristic,
  validateLlmClassifierJson,
  resolveClassifierMode,
  clearClassifierCacheForTests,
  FLOW_CLASSIFIER_SCHEMA_VERSION,
  type ClassifyTurnInput
} from "../services/PromptServices/AttendanceFlowClassifierService";
import { compileAttendanceFlowIR } from "../helpers/compileAttendanceFlowIR";
import { buildDeterministicFallback } from "../services/PromptServices/AttendanceFlowUnderstandingService";

function compileSample() {
  const script = [
    "# ETAPA 1 — Abertura",
    "Olá! Você quer agendar agora ou daqui a pouco?",
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
  ].join("\n");
  return compileAttendanceFlowIR({
    script,
    smartActions: [{ id: 5, slug: "agendamento", type: "agendamento", name: "Agendar" }]
  });
}

function inputForStep(
  userText: string,
  stepIndex: number,
  overrides: Partial<ClassifyTurnInput> = {}
): ClassifyTurnInput {
  const { steps, definition } = compileSample();
  const u = buildDeterministicFallback(steps, definition, "h");
  return {
    userText,
    currentStep: steps[stepIndex],
    understanding: u,
    mode: "heuristic",
    disableCache: true,
    ...overrides
  };
}

describe("applyHeuristic — fallback determinístico", () => {
  it("classifies empty / emoji-only as noise", () => {
    const r = applyHeuristic(inputForStep("👍", 1));
    expect(r.intent).toBe("noise");
    expect(r.source).toBe("fallback");
  });

  it("classifies 'repete' as repeat", () => {
    const r = applyHeuristic(inputForStep("não entendi, repete por favor", 1));
    expect(r.intent).toBe("repeat");
  });

  it("classifies 'desisto' as terminate", () => {
    const r = applyHeuristic(inputForStep("desisto, deixa pra lá", 1));
    expect(r.intent).toBe("terminate");
  });

  it("classifies 'ah, errado, é dia 21' as correction with target=previous step", () => {
    const r = applyHeuristic(
      inputForStep("ah, errado, é dia 21 na verdade", 2, {
        answersByStep: { "1": "agendar", "2": "dia 20" }
      })
    );
    expect(r.intent).toBe("correction");
    expect(r.correctionTarget).toBe("s2");
  });

  it("advances on date step when reply contains a date", () => {
    const r = applyHeuristic(inputForStep("dia 21/05 às 14h", 1));
    expect(r.intent).toBe("advance");
    expect(r.filledSlot?.type).toBe("date");
    expect(typeof r.filledSlot?.value).toBe("string");
    expect((r.filledSlot?.value as string) || "").toMatch(/2026-05-21T/);
  });

  it("advances on number step when reply contains a number", () => {
    const r = applyHeuristic(inputForStep("somos 4 adultos", 2));
    expect(r.intent).toBe("advance");
    expect(r.filledSlot?.type).toBe("number");
    expect(r.filledSlot?.value).toBe(4);
  });

  it("advances on yes_no step when reply is 'sim'", () => {
    const r = applyHeuristic(inputForStep("sim, pode confirmar", 3));
    expect(r.intent).toBe("advance");
    expect(r.filledSlot?.type).toBe("yes_no");
    expect(r.filledSlot?.value).toBe("sim");
  });

  it("advances on yes_no step when reply is 'não'", () => {
    const r = applyHeuristic(inputForStep("não", 3));
    expect(r.intent).toBe("advance");
    expect(r.filledSlot?.value).toBe("nao");
  });

  it("matches semantic branch on step 1 ('agendar agora' → branch label)", () => {
    const r = applyHeuristic(inputForStep("quero agendar agora", 0));
    expect(r.intent).toBe("advance");
    expect(r.matchedBranch?.matcher).toBe("semantic");
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("matches natural-choice reply by partial semantic option", () => {
    const { steps, definition } = compileAttendanceFlowIR({
      script: [
        "# ETAPA 1",
        "Você procura mais organização interna, automação de atendimento ou crescimento nas vendas?",
        "---",
        "# ETAPA 2",
        "Qual é a maior dificuldade hoje?"
      ].join("\n")
    });
    const r = applyHeuristic({
      userText: "organização",
      currentStep: steps[0],
      understanding: buildDeterministicFallback(steps, definition, "choice"),
      mode: "heuristic",
      disableCache: true
    });
    expect(r.intent).toBe("advance");
    expect(r.matchedBranch?.label).toBe("organização interna");
    expect(r.filledSlot).toMatchObject({
      name: "interest",
      type: "choice",
      value: "organização interna"
    });
  });

  it("flags off_topic when client asks unrelated question on date step", () => {
    const r = applyHeuristic(inputForStep("vocês trabalham com pacotes para crianças?", 1));
    expect(r.intent).toBe("off_topic");
  });

  it("does not advance date step when client asks for price instead", () => {
    const r = applyHeuristic(inputForStep("quero saber valores primeiro", 1));
    expect(r.intent).toBe("off_topic");
    expect(r.reasoning).toMatch(/preço|valor/i);
  });

  it("low confidence when answer to date step is plain text without date hints", () => {
    const r = applyHeuristic(inputForStep("preciso pensar ainda", 1));
    expect(r.intent).toBe("off_topic");
  });
});

describe("validateLlmClassifierJson — schema", () => {
  const ids = new Set(["s1", "s2", "s3", "s4"]);

  it("accepts minimal valid object", () => {
    const r = validateLlmClassifierJson(
      {
        intent: "advance",
        targetStepId: "s2",
        matchedBranch: null,
        filledSlot: null,
        correctionTarget: null,
        confidence: 0.9,
        reasoning: "ok"
      },
      ids
    );
    expect(r.ok).toBe(true);
  });

  it("accepts operational anti-silence fields from the LLM", () => {
    const r = validateLlmClassifierJson(
      {
        intent: "advance",
        targetStepId: "s2",
        matchedBranch: null,
        filledSlot: null,
        correctionTarget: null,
        shouldRespondNow: true,
        missingInfo: ["telefone"],
        nextNaturalQuestion: "Qual telefone posso registrar?",
        mustNotConsumeSilently: true,
        confidence: 0.9,
        reasoning: "Resposta parcial."
      },
      ids
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.missingInfo).toEqual(["telefone"]);
      expect(r.value.nextNaturalQuestion).toMatch(/telefone/);
      expect(r.value.mustNotConsumeSilently).toBe(true);
    }
  });

  it("rejects unknown intent", () => {
    const r = validateLlmClassifierJson({ intent: "bogus" }, ids);
    expect(r.ok).toBe(false);
  });

  it("rejects unknown targetStepId", () => {
    const r = validateLlmClassifierJson(
      { intent: "advance", targetStepId: "ghost" },
      ids
    );
    expect(r.ok).toBe(false);
  });

  it("rejects unknown correctionTarget", () => {
    const r = validateLlmClassifierJson(
      { intent: "correction", correctionTarget: "ghost" },
      ids
    );
    expect(r.ok).toBe(false);
  });

  it("clamps confidence to [0,1]", () => {
    const r = validateLlmClassifierJson(
      { intent: "advance", confidence: 5 },
      ids
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.confidence).toBe(1);
  });

  it("drops unknown matcher in matchedBranch silently", () => {
    const r = validateLlmClassifierJson(
      {
        intent: "advance",
        matchedBranch: { matcher: "weird", label: "x", nextStepId: "s2" }
      },
      ids
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.matchedBranch).toBeNull();
  });
});

describe("classifyAttendanceFlowTurn — orchestrator", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    clearClassifierCacheForTests();
    delete process.env.ATTENDANCE_FLOW_CLASSIFIER_MODE;
  });

  it("mode='heuristic' (default) never calls LLM and returns heuristic", async () => {
    const r = await classifyAttendanceFlowTurn(inputForStep("dia 25/05", 1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(r.intent).toBe("advance");
    expect(r.source).toBe("fallback");
  });

  it("mode='auto' with HIGH heuristic confidence keeps heuristic (no LLM)", async () => {
    /** "agendar agora" no step 0 bate semantic → confidence >= 0.8. */
    const r = await classifyAttendanceFlowTurn(
      inputForStep("agendar agora", 0, { mode: "auto", apiKey: "sk-test" })
    );
    expect(mockCreate).not.toHaveBeenCalled();
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("mode='auto' with LOW heuristic confidence calls LLM", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "off_topic",
              targetStepId: "s2",
              matchedBranch: null,
              filledSlot: null,
              correctionTarget: null,
              confidence: 0.85,
              reasoning: "LLM decidiu off-topic"
            })
          }
        }
      ]
    });
    const r = await classifyAttendanceFlowTurn(
      inputForStep("acho que sim", 1, {
        mode: "auto",
        apiKey: "sk-test"
      })
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(r.intent).toBe("off_topic");
    expect(r.source).toBe("llm");
  });

  it("mode='auto' with malformed LLM JSON falls back to heuristic", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not a json" } }]
    });
    const r = await classifyAttendanceFlowTurn(
      inputForStep("acho que sim", 1, {
        mode: "auto",
        apiKey: "sk-test"
      })
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(r.source).toBe("fallback");
  });

  it("mode='llm' (strict) throws when API key missing", async () => {
    await expect(
      classifyAttendanceFlowTurn(inputForStep("x", 1, { mode: "llm" }))
    ).rejects.toThrow(/openai_api_key_missing/);
  });

  it("uses cache on identical input (no extra LLM call)", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "advance",
              targetStepId: "s2",
              confidence: 0.9,
              reasoning: "x"
            })
          }
        }
      ]
    });
    /** Vai pro LLM (low confidence triggers it). */
    const first = await classifyAttendanceFlowTurn(
      inputForStep("acho que sim", 1, {
        mode: "auto",
        apiKey: "sk-test",
        disableCache: false
      })
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(first.source).toBe("llm");

    const second = await classifyAttendanceFlowTurn(
      inputForStep("acho que sim", 1, {
        mode: "auto",
        apiKey: "sk-test",
        disableCache: false
      })
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(second.source).toBe("cache");
  });

  it("cache miss on different userText for same step", async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "advance",
              targetStepId: "s2",
              confidence: 0.9,
              reasoning: "x"
            })
          }
        }
      ]
    });
    await classifyAttendanceFlowTurn(
      inputForStep("texto A", 1, { mode: "auto", apiKey: "sk-test", disableCache: false })
    );
    await classifyAttendanceFlowTurn(
      inputForStep("texto B", 1, { mode: "auto", apiKey: "sk-test", disableCache: false })
    );
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe("resolveClassifierMode", () => {
  beforeEach(() => {
    delete process.env.ATTENDANCE_FLOW_CLASSIFIER_MODE;
  });

  it("returns 'heuristic' by default", () => {
    expect(resolveClassifierMode()).toBe("heuristic");
  });

  it("honors env ATTENDANCE_FLOW_CLASSIFIER_MODE=auto", () => {
    process.env.ATTENDANCE_FLOW_CLASSIFIER_MODE = "auto";
    expect(resolveClassifierMode()).toBe("auto");
  });

  it("explicit override wins over env", () => {
    process.env.ATTENDANCE_FLOW_CLASSIFIER_MODE = "auto";
    expect(resolveClassifierMode("heuristic")).toBe("heuristic");
  });
});

describe("schema version", () => {
  it("exports FLOW_CLASSIFIER_SCHEMA_VERSION = 1", () => {
    expect(FLOW_CLASSIFIER_SCHEMA_VERSION).toBe(1);
  });
});
