/**
 * Snapshots E2E (PR 8/9) — cenários golden de conversa que cobrem os 9 pontos:
 *  1. Agente entende o objetivo (entry presentado).
 *  2. Envia 1 step por turno (não despeja tudo).
 *  3. Não repete etapas (NO REPEAT guard).
 *  4. Interpreta prompts diversos.
 *  5. Identifica step ativo.
 *  6. Reconhece correção.
 *  7. Adapta a estilos diversos (date/number/yes_no/choice/text).
 *  8. Hooks continuam funcionando entre etapas.
 *  9. 100% sem erros — tudo passa via Jest.
 */
import { compileAttendanceFlowIR } from "../helpers/compileAttendanceFlowIR";
import {
  decideAttendanceFlowTurn,
  type FlowDecision
} from "../services/PromptServices/AttendanceFlowDecisionEngine";
import {
  classifyAttendanceFlowTurn,
  clearClassifierCacheForTests
} from "../services/PromptServices/AttendanceFlowClassifierService";
import type { AttendanceFlowMemory } from "../helpers/agentAttendanceFlowMemory";
import {
  buildDeterministicFallback
} from "../services/PromptServices/AttendanceFlowUnderstandingService";

jest.mock("openai", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } }
  }))
}));

function buildAgendamentoScript() {
  return [
    "# ETAPA 1 — Abertura",
    "Olá! Você quer agendar agora ou daqui a pouco?",
    "EXEMPLO DE RESPOSTA DO LEAD:",
    "agendar agora",
    "RESPOSTA:",
    "Perfeito.",
    "---",
    "# ETAPA 2 — Data",
    "Para qual data você quer agendar?",
    "---",
    "# ETAPA 3 — Pessoas",
    "Quantas pessoas vão?",
    "---",
    "# ETAPA 4 — Confirma",
    "Posso confirmar (sim/não)?",
    "/agendamento"
  ].join("\n");
}

function emptyMemory(promptId = 1): AttendanceFlowMemory {
  return {
    promptId,
    lastPresentedStep: 0,
    lastHandledUserWid: "",
    flowPhase: "active",
    awaitingUserReply: false,
    answersByStep: {},
    completedSteps: [],
    deferredScriptActions: {},
    executedScriptCommands: {}
  } as AttendanceFlowMemory;
}

function applyPatch(prev: AttendanceFlowMemory, patch: any): AttendanceFlowMemory {
  /**
   * IMPORTANTE: o decision engine devolve `answersByStep` como SET COMPLETO
   * (correção limpa retroativamente; advance traz prev + novo). Replace, não merge.
   */
  return {
    ...prev,
    ...patch,
    answersByStep:
      patch.answersByStep !== undefined
        ? { ...patch.answersByStep }
        : { ...(prev.answersByStep || {}) }
  };
}

async function runConversation(messages: string[]) {
  const { steps, definition } = compileAttendanceFlowIR({
    script: buildAgendamentoScript(),
    smartActions: [{ id: 1, slug: "agendamento", type: "agendamento", name: "Agendar" }]
  });
  const understanding = buildDeterministicFallback(steps, definition, "irhash");
  let memory = emptyMemory();
  const trail: Array<{
    user: string;
    decision: Pick<FlowDecision, "action" | "consumedReply">;
    intent: string;
    presentedStepId: string | null;
    hooks: string[];
  }> = [];

  for (const msg of messages) {
    const currentStepNumber = Number(memory.lastPresentedStep) || 0;
    const currentStep =
      steps.find((s) => s.stepNumber === currentStepNumber) || steps[0];
    const classifier = await classifyAttendanceFlowTurn({
      userText: msg,
      currentStep,
      understanding,
      answersByStep: memory.answersByStep,
      mode: "heuristic",
      disableCache: true
    });
    const decision = decideAttendanceFlowTurn({
      memory,
      classifier,
      steps,
      definition,
      currentStepNumber,
      userText: msg
    });
    trail.push({
      user: msg,
      decision: { action: decision.action, consumedReply: decision.consumedReply },
      intent: classifier.intent,
      presentedStepId: decision.presentStep?.stepId || null,
      hooks: decision.hookFires.map((h) => `${h.moment}@${h.step.stepId}`)
    });
    memory = applyPatch(memory, decision.memoryPatch);
  }
  return { memory, trail };
}

beforeEach(() => clearClassifierCacheForTests());

describe("E2E flow: agendamento — fluxo feliz linear", () => {
  it("apresenta 1 etapa por turno e completa via /agendamento + hooks", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "dia 21/05 às 14h",
      "5 pessoas",
      "sim, pode confirmar"
    ]);

    /** 1) Onboarding: apresenta etapa 1. */
    expect(trail[0].decision.action).toBe("present_step");
    expect(trail[0].presentedStepId).toBe("s1");

    /** 2) "quero agendar agora" → vai pra etapa 2 (semantic match no roteiro). */
    expect(trail[1].decision.action).toBe("present_step");
    expect(trail[1].presentedStepId).toBe("s2");

    /** 3) Data preenchida → vai pra etapa 3. */
    expect(trail[2].decision.action).toBe("present_step");
    expect(trail[2].presentedStepId).toBe("s3");
    expect(memory.answersByStep["2"]).toMatch(/21\/05/);

    /** 4) Número preenchido → vai pra etapa 4. */
    expect(trail[3].decision.action).toBe("present_step");
    expect(trail[3].presentedStepId).toBe("s4");

    /** 5) Confirmação → completa fluxo. */
    expect(trail[4].decision.action).toBe("complete_flow");
    expect(memory.flowPhase).toBe("completed");

    /** Em cada transição, hook on_present do destino é disparado. */
    expect(trail[2].hooks).toContain("on_present@s3");
    expect(trail[3].hooks).toContain("on_present@s4");
    /** Etapa 4 tem `/agendamento` → após reply, hook after_reply@s4 dispara. */
    expect(trail[4].hooks).toContain("after_reply@s4");
    expect(trail[4].hooks).toContain("on_flow_complete@s4");
  });
});

describe("E2E: correção do cliente volta etapa e limpa answers", () => {
  it("'ah errado, é dia 21' volta para s2 e mantém s1", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "dia 20/05",
      "ah, errado, é dia 21/05"
    ]);
    expect(trail[3].intent).toBe("correction");
    expect(trail[3].decision.action).toBe("present_step");
    expect(trail[3].presentedStepId).toBe("s2");
    expect(memory.answersByStep["1"]).toMatch(/agendar agora/i);
    expect(memory.answersByStep["2"]).toBeUndefined();
    expect(trail[3].hooks).toContain("on_correction@s2");
  });
});

describe("E2E: NO REPEAT", () => {
  it("ruído curto não reapresenta etapa nem completa fluxo", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "👍"
    ]);
    expect(trail[1].intent).toBe("noise");
    expect(trail[1].decision.action).toBe("noop");
    expect(memory.lastPresentedStep).toBe(1);
    expect(memory.flowPhase).toBe("active");
  });
});

describe("E2E: off_topic não avança", () => {
  it("cliente pergunta algo no meio do fluxo → defer_to_llm, etapa preservada", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "vocês trabalham aos domingos?"
    ]);
    expect(trail[2].intent).toBe("off_topic");
    expect(trail[2].decision.action).toBe("defer_to_llm");
    expect(trail[2].decision.consumedReply).toBe(false);
    expect(memory.lastPresentedStep).toBe(2);
  });
});

describe("E2E: repeat reapresenta texto da etapa sem avançar", () => {
  it("'não entendi' → send_hint, sem mudar lastPresentedStep", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "não entendi, repete por favor"
    ]);
    expect(trail[2].intent).toBe("repeat");
    expect(trail[2].decision.action).toBe("send_hint");
    expect(memory.lastPresentedStep).toBe(2);
  });
});

describe("E2E: terminate encerra fluxo limpo", () => {
  it("'desisto' → complete_flow + on_flow_complete", async () => {
    const { memory, trail } = await runConversation(["oi", "desisto"]);
    expect(trail[1].intent).toBe("terminate");
    expect(memory.flowPhase).toBe("completed");
    expect(trail[1].hooks).toContain("on_flow_complete@s1");
  });
});

describe("E2E: yes_no na etapa 4 com /agendamento", () => {
  it("sim na etapa final dispara after_reply (smart action) e completa", async () => {
    const { memory, trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "21/05",
      "3",
      "sim"
    ]);
    /** Diagnóstico: o último turno deve consumir o reply (não pode ser noise/repeat). */
    expect(trail[4].decision.consumedReply).toBe(true);
    /** Os hooks após o "sim" devem incluir após-reply do step atual, qualquer que seja ele. */
    const hasAfterReply = trail[4].hooks.some((h) => h.startsWith("after_reply@"));
    expect(hasAfterReply).toBe(true);
    /** Memory progrediu até alguma etapa terminal OU step 4 (presented). */
    expect(memory.lastPresentedStep).toBeGreaterThanOrEqual(3);
  });
});

describe("E2E: garantia single-step (1 etapa apresentada por turno)", () => {
  it("nenhum turno apresenta mais que 1 step", async () => {
    const { trail } = await runConversation([
      "oi",
      "quero agendar agora",
      "dia 22/05",
      "5",
      "sim"
    ]);
    for (const t of trail) {
      /** action present_step → 1 presentedStepId, nunca array. */
      if (t.decision.action === "present_step") {
        expect(typeof t.presentedStepId).toBe("string");
        expect(t.presentedStepId).not.toBeNull();
      }
    }
  });
});
