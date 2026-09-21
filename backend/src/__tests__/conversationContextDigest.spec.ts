import { buildConversationContextDigest } from "../helpers/conversationContextDigest";

function makeTicket(dataWebhook: any) {
  return {
    dataWebhook,
    getDataValue: (k: string) => (k === "dataWebhook" ? dataWebhook : undefined)
  } as any;
}

describe("buildConversationContextDigest", () => {
  it("renders empty state cleanly", () => {
    const t = makeTicket({});
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("CONTEXTO DA CONVERSA");
    expect(d).toContain("Etapas concluídas: nenhuma");
    expect(d).toContain("Etapa ativa: (ainda não iniciada)");
    expect(d).toContain("Slots preenchidos: nenhum");
    expect(d).toContain("Intents pendentes: nenhuma");
  });

  it("renders completed steps with answers and active step", () => {
    const t = makeTicket({
      attendanceFlow: {
        promptId: 1,
        lastPresentedStep: 4,
        awaitingUserReply: true,
        completedSteps: [1, 2, 3],
        answersByStep: { "2": "21/05", "3": "3 pessoas" }
      }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("Etapas concluídas: s1, s2 (“21/05”), s3 (“3 pessoas”)");
    expect(d).toContain("Etapa ativa: s4 (aguardando resposta do cliente)");
    expect(d).toContain("s2=21/05");
    expect(d).toContain("s3=3 pessoas");
  });

  it("renders pending intents", () => {
    const t = makeTicket({
      agentState: {
        pendingIntents: [
          { kind: "schedule", satisfiedBy: "date", registeredAt: new Date().toISOString(), maxAgeMinutes: 30, confidence: 0.9 }
        ]
      }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("schedule (espera date)");
  });

  it("renders consolidated conversational memory", () => {
    const t = makeTicket({
      agentState: {
        conversationalMemory: {
          promptId: 1,
          knownFacts: {
            name: "Ana",
            preferredTime: "amanhã depois do almoço",
            intent: "agendamento"
          },
          currentObjective: "marcar horario",
          pendingFields: ["telefone"]
        }
      }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("Memória lógica");
    expect(d).toContain("nome=Ana");
    expect(d).toContain("horario=amanhã depois do almoço");
    expect(d).toContain("Objetivo atual provável: marcar horario");
  });

  it("renders LLM-first semantic state", () => {
    const t = makeTicket({
      agentState: {
        llmFirstState: {
          promptId: 1,
          userIntent: "organização interna",
          currentObjective: "entender gargalo operacional",
          currentStage: "qualificação",
          missingData: ["maior dificuldade"]
        }
      }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("Estado semântico LLM-first");
    expect(d).toContain("organização interna");
    expect(d).toContain("maior dificuldade");
  });

  it("ignores LLM-first semantic state from an older prompt version", () => {
    const t = makeTicket({
      agentState: {
        llmFirstState: {
          promptId: 1,
          promptStateKey: "1:old",
          userIntent: "gestação",
          currentObjective: "qualificar gestação",
          currentStage: "gestação",
          missingData: ["tempo_gestacao"]
        }
      }
    });
    const d = buildConversationContextDigest({
      ticket: t,
      promptId: 1,
      promptStateKey: "1:new"
    });
    expect(d).toContain("Estado semântico LLM-first: ainda não consolidado");
    expect(d).not.toContain("gestação");
  });

  it("includes recent turns labeled AGENTE/CLIENTE", () => {
    const t = makeTicket({});
    const d = buildConversationContextDigest({
      ticket: t,
      promptId: 1,
      recentTurns: [
        { fromMe: true, body: "Gostaria de agendar?" },
        { fromMe: false, body: "Sim, semana que vem" }
      ]
    });
    expect(d).toContain("AGENTE: Gostaria de agendar?");
    expect(d).toContain("CLIENTE: Sim, semana que vem");
  });

  it("includes operational anti-silence and partial-answer policy", () => {
    const t = makeTicket({});
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("DECISÃO OBRIGATÓRIA");
    expect(d).toContain("duas perguntas");
    expect(d).toContain("turno substantivo sem resposta visível");
  });

  it("truncates long answers", () => {
    const long = "a".repeat(200);
    const t = makeTicket({
      attendanceFlow: {
        promptId: 1,
        completedSteps: [1],
        answersByStep: { "1": long }
      }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toMatch(/“a{20,}…”/);
  });

  it("respects maxTurns", () => {
    const t = makeTicket({});
    const d = buildConversationContextDigest({
      ticket: t,
      promptId: 1,
      maxTurns: 2,
      recentTurns: [
        { fromMe: true, body: "t1" },
        { fromMe: false, body: "t2" },
        { fromMe: true, body: "t3" },
        { fromMe: false, body: "t4" }
      ]
    });
    expect(d).toContain("AGENTE: t3");
    expect(d).toContain("CLIENTE: t4");
    expect(d).not.toContain("AGENTE: t1");
  });

  it("ignores attendanceFlow with mismatched promptId", () => {
    const t = makeTicket({
      attendanceFlow: { promptId: 99, lastPresentedStep: 5, completedSteps: [1, 2] }
    });
    const d = buildConversationContextDigest({ ticket: t, promptId: 1 });
    expect(d).toContain("Etapas concluídas: nenhuma");
  });
});
