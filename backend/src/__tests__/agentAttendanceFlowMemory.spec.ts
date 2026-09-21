import {
  normalizeAttendanceFlowMemory,
  shouldAdvanceOnFreeReply,
  customerVisibleStepEndsWithQuestionOrCommand,
  buildAttendanceFlowLlmAnchor,
  bodyLooksLikeDateOrPeriodReply,
  plausibleFreeReplyAdvancesStep,
  isTrivialFlowInboundNoise,
  isGreetingStyleStep,
  isReciprocalGreetingReply,
  isGreetingStepAcceptableReply,
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply,
  looksLikeCustomerQuestion,
  stripLeadingGreeting
} from "../helpers/agentAttendanceFlowMemory";
import { stripAgentFlowScriptTrainingMarkers } from "../helpers/stripAgentFlowScriptTrainingMarkers";
import { matchAttendanceFlowResponseOption } from "../helpers/attendanceFlowMatchResponse";
import Ticket from "../models/Ticket";

describe("agentAttendanceFlowMemory", () => {
  it("normalizes and preserves completed steps", () => {
    const m = normalizeAttendanceFlowMemory(
      {
        promptId: 17,
        lastPresentedStep: 3,
        completedSteps: [1, 2],
        answersByStep: { "2": "4 adultos" }
      },
      17
    );
    expect(m.promptId).toBe(17);
    expect(m.lastPresentedStep).toBe(3);
    expect(m.completedSteps).toEqual([1, 2]);
    expect(m.answersByStep?.["2"]).toBe("4 adultos");
  });

  it("normalizes deferredScriptActions", () => {
    const m = normalizeAttendanceFlowMemory(
      {
        promptId: 1,
        deferredScriptActions: { "2": [{ slug: "agendamento", actionId: 9 }] }
      },
      1
    );
    expect(m.deferredScriptActions?.["2"]).toEqual([{ slug: "agendamento", actionId: 9 }]);
  });

  it("preserves kind on deferredScriptActions", () => {
    const m = normalizeAttendanceFlowMemory(
      {
        promptId: 1,
        deferredScriptActions: {
          "2": [{ slug: "marcarConsulta", actionId: 3, kind: "agendamento" }]
        }
      },
      1
    );
    expect(m.deferredScriptActions?.["2"]).toEqual([
      { slug: "marcarConsulta", actionId: 3, kind: "agendamento" }
    ]);
  });

  it("shouldAdvanceOnFreeReply rejects empty", () => {
    expect(shouldAdvanceOnFreeReply("")).toBe(false);
    expect(shouldAdvanceOnFreeReply("   ")).toBe(false);
  });

  it("shouldAdvanceOnFreeReply accepts substantive", () => {
    expect(shouldAdvanceOnFreeReply("4 adultos")).toBe(true);
    expect(shouldAdvanceOnFreeReply("sim")).toBe(true);
  });

  it("buildAttendanceFlowLlmAnchor reads ticket dataWebhook", () => {
    const t = { getDataValue: (k: string) => (k === "dataWebhook" ? { attendanceFlow: { promptId: 9, lastPresentedStep: 2, completedSteps: [1], lastPresentedTextPreview: "Quantas pessoas?" } } : null) } as unknown as Ticket;
    const s = buildAttendanceFlowLlmAnchor(t, 9);
    expect(s).toContain("Etapa atual salva: 2");
    expect(s).toContain("Quantas pessoas?");
    expect(s).toMatch(/Aguardando resposta do cliente/);
  });

  it("buildAttendanceFlowLlmAnchor inclui sequência pergunta-resposta quando awaitingUserReply", () => {
    const t = {
      getDataValue: (k: string) =>
        k === "dataWebhook"
          ? {
              attendanceFlow: {
                promptId: 9,
                lastPresentedStep: 1,
                awaitingUserReply: true,
                lastPresentedTextPreview: "Para qual data deseja viajar?"
              }
            }
          : null
    } as unknown as Ticket;
    const s = buildAttendanceFlowLlmAnchor(t, 9);
    expect(s).toContain("Aguardando resposta");
    expect(s).toMatch(/Sequência pergunta|pergunta → resposta/i);
  });

  it("customerVisibleStepEndsWithQuestionOrCommand: pergunta no fim", () => {
    expect(customerVisibleStepEndsWithQuestionOrCommand("Olá.\nTudo bem?")).toBe(true);
  });

  it("customerVisibleStepEndsWithQuestionOrCommand: afirmação sem pergunta nem comando", () => {
    expect(customerVisibleStepEndsWithQuestionOrCommand("Obrigado pela preferência.")).toBe(false);
  });

  it("customerVisibleStepEndsWithQuestionOrCommand: termina com /comando", () => {
    expect(customerVisibleStepEndsWithQuestionOrCommand("Confirmando.\n/agendamento")).toBe(true);
  });

  it("isGreetingStyleStep detecta abertura de saudação", () => {
    expect(isGreetingStyleStep("Fala, tudo bem?")).toBe(true);
    expect(isGreetingStyleStep("Para qual data deseja viajar?")).toBe(false);
  });

  it("isReciprocalGreetingReply reconhece resposta curta à saudação", () => {
    expect(isReciprocalGreetingReply("tudo bem")).toBe(true);
    expect(isReciprocalGreetingReply("oi tudo bem")).toBe(true);
    expect(isReciprocalGreetingReply("Oi")).toBe(true);
    expect(isReciprocalGreetingReply("Tudo")).toBe(true);
    expect(isReciprocalGreetingReply("quero agendar para sexta")).toBe(false);
  });

  it("isGreetingStepAcceptableReply inclui ruído trivial em etapa de saudação", () => {
    expect(isGreetingStepAcceptableReply("Oi")).toBe(true);
    expect(isGreetingStepAcceptableReply("Simm")).toBe(true);
    expect(isGreetingStepAcceptableReply("quero agendar para sexta")).toBe(false);
  });

  it("customerVisibleStepEndsWithQuestionOrCommand: menu com keycap emoji (última linha sem ?)", () => {
    const raw = [
      "Mensagem:",
      "Qual opção combina mais?",
      "",
      "1\uFE0F\u20E3 Beira-mar",
      "2\uFE0F\u20E3 Piscina",
      "3\uFE0F\u20E3 Privacidade",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      "2",
      "RESPOSTA:",
      "Perfeito"
    ].join("\n");
    expect(customerVisibleStepEndsWithQuestionOrCommand(raw)).toBe(true);
    const vis = stripAgentFlowScriptTrainingMarkers(raw);
    expect(plausibleFreeReplyAdvancesStep(vis, "2")).toBe(true);
  });

  it("pergunta visível vence /agendamento no fim do arquivo (etapa tipo Pousada)", () => {
    const raw = [
      "Mensagem:",
      "Me conta: para qual data você está pensando em viajar?",
      "EXEMPLO DE RESPOSTA DO LEAD:",
      '"21/05"',
      "RESPOSTA:",
      "Perfeito",
      "/agendamento"
    ].join("\n");
    expect(customerVisibleStepEndsWithQuestionOrCommand(raw)).toBe(true);
    const vis = stripAgentFlowScriptTrainingMarkers(raw);
    expect(vis).toMatch(/qual data/i);
    expect(plausibleFreeReplyAdvancesStep(vis, "Olá")).toBe(false);
    expect(plausibleFreeReplyAdvancesStep(vis, "quero saber valores")).toBe(false);
    expect(bodyLooksLikeDateOrPeriodReply("Olá")).toBe(false);
    expect(bodyLooksLikeDateOrPeriodReply("final de julho")).toBe(true);
    expect(isTrivialFlowInboundNoise("Oi")).toBe(true);
  });

  it("plausibleFreeReplyAdvancesStep: quantidade de hóspedes", () => {
    const vis = "E quantas pessoas seriam na hospedagem?";
    expect(plausibleFreeReplyAdvancesStep(vis, "4 pessoas")).toBe(true);
    expect(plausibleFreeReplyAdvancesStep(vis, "casal")).toBe(true);
    expect(plausibleFreeReplyAdvancesStep(vis, "Oi")).toBe(false);
  });

  it("looksLikeCustomerQuestion detecta FAQ sem ?", () => {
    expect(looksLikeCustomerQuestion("quero saber valores")).toBe(true);
    expect(looksLikeCustomerQuestion("21/05")).toBe(false);
  });

  it("stripLeadingGreeting separa cumprimento de pergunta", () => {
    expect(stripLeadingGreeting("tudo bem, quanto custa?")).toBe("quanto custa?");
  });

  it("classifyScriptInboundTurn: abertura + FAQ deferToLlm", () => {
    const d = classifyScriptInboundTurn("Fala, tudo bem?", "quanto custa?");
    expect(d.deferToLlm).toBe(true);
    expect(d.shouldCannedAdvance).toBe(false);
  });

  it("classifyScriptInboundTurn: agendamento + preço deferToLlm", () => {
    const vis = "Para qual data você deseja viajar?";
    const d = classifyScriptInboundTurn(vis, "quero saber valores");
    expect(d.deferToLlm).toBe(true);
    expect(d.shouldCannedAdvance).toBe(false);
  });

  it("classifyScriptInboundTurn: data válida avança", () => {
    const vis = "Para qual data você deseja viajar?";
    expect(classifyScriptInboundTurn(vis, "21/05").shouldCannedAdvance).toBe(true);
    expect(classifyScriptInboundTurn(vis, "final de julho").shouldCannedAdvance).toBe(true);
  });

  it("classifyScriptInboundTurn: menu + dígito avança", () => {
    const vis = "Qual opção?\n1️⃣ Beira-mar\n2️⃣ Piscina";
    expect(classifyScriptInboundTurn(vis, "2").shouldCannedAdvance).toBe(true);
  });

  it("buildAttendanceFlowLlmAnchor inclui bloco INTERRUPÇÃO", () => {
    const t = {
      getDataValue: (k: string) =>
        k === "dataWebhook"
          ? { attendanceFlow: { promptId: 9, lastPresentedStep: 1, awaitingUserReply: true } }
          : null
    } as unknown as Ticket;
    expect(buildAttendanceFlowLlmAnchor(t, 9)).toMatch(/INTERRUPÇÃO/i);
  });
});

describe("matchAttendanceFlowResponseOption open mode", () => {
  it("matches substantive reply on open", () => {
    const opt = matchAttendanceFlowResponseOption("4 adultos e 1 criança", [
      { text: "", matchMode: "open", nextStep: 3 }
    ]);
    expect(opt?.nextStep).toBe(3);
  });

  it("open/any ignoram FAQ interrupção", () => {
    const open = matchAttendanceFlowResponseOption("quanto custa?", [
      { text: "", matchMode: "open", nextStep: 3 }
    ]);
    expect(open).toBeNull();
    const any = matchAttendanceFlowResponseOption("quero saber valores", [
      { text: "x", matchMode: "any", nextStep: 2 }
    ]);
    expect(any).toBeNull();
  });
});
