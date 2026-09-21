import {
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply
} from "../helpers/agentAttendanceFlowMemory";
import { decideAttendanceFlowTurn } from "../services/PromptServices/AttendanceFlowDecisionEngine";
import { applyHeuristic } from "../services/PromptServices/AttendanceFlowClassifierService";
import type { CompiledStepIR } from "../helpers/compileAttendanceFlowIR";

const DATE_VISIBLE = "Me conta: para qual data você está pensando em viajar?";
const GREET_VISIBLE = "Fala, tudo bem?";

const FAQ_MATRIX = [
  "quanto custa?",
  "vocês atendem no domingo?",
  "quero saber valores",
  "qual o preço do plano",
  "tem desconto?",
  "como funciona o cancelamento",
  "vocês trabalham feriado?",
  "pode me explicar os pacotes?",
  "qual a diária?",
  "tem estacionamento?",
  "aceita cartão?",
  "onde fica a pousada?",
  "tem piscina?"
];

describe("scriptInboundInterruptions — FAQ nunca avança canned", () => {
  for (const q of FAQ_MATRIX) {
    it(`"${q}" não deve shouldCannedAdvance na etapa de data`, () => {
      const d = classifyScriptInboundTurn(DATE_VISIBLE, q);
      expect(d.shouldCannedAdvance).toBe(false);
      expect(d.deferToLlm).toBe(true);
    });
  }

  it("respostas válidas ainda avançam", () => {
    expect(shouldCannedAdvanceOnFreeReply(DATE_VISIBLE, "21/05")).toBe(true);
    expect(shouldCannedAdvanceOnFreeReply(GREET_VISIBLE, "tudo bem")).toBe(true);
  });
});

function makeStep(overrides: Partial<CompiledStepIR> = {}): CompiledStepIR {
  return {
    stepId: "s1",
    stepNumber: 1,
    title: "Data",
    objective: "Coletar data",
    agentPrompt: DATE_VISIBLE,
    customerVisibleText: DATE_VISIBLE,
    expectedReply: "date",
    slotName: "preferredDate",
    branchesIR: [],
    attachments: [],
    ...overrides
  } as CompiledStepIR;
}

describe("classifier + decision engine → defer_to_llm", () => {
  it("off_topic vira defer_to_llm sem consumir turno", () => {
    const classifier = applyHeuristic({
      userText: "quanto custa o plano?",
      currentStep: makeStep()
    });
    expect(classifier.intent).toBe("off_topic");

    const decision = decideAttendanceFlowTurn({
      memory: {
        promptId: 1,
        lastPresentedStep: 1,
        awaitingUserReply: true,
        flowPhase: "active"
      },
      classifier,
      steps: [makeStep()],
      definition: { entryStepId: "s1", transitionHooks: [] } as any,
      currentStepNumber: 1,
      userText: "quanto custa o plano?"
    });
    expect(decision.action).toBe("defer_to_llm");
    expect(decision.consumedReply).toBe(false);
    expect(decision.hintText).toBeNull();
  });
});
