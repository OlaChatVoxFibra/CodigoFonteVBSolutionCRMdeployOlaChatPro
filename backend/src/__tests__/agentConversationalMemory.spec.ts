import {
  inferFactsFromUserText,
  mergeAgentConversationalMemory,
  normalizeAgentConversationalMemory
} from "../helpers/agentConversationalMemory";
import { parseDateTimeFromText } from "../helpers/parseDateTimeFromText";

describe("agentConversationalMemory", () => {
  it("extracts contact and scheduling facts from natural text", () => {
    const facts = inferFactsFromUserText(
      "Meu nome é Ana Silva, sou de Recife. Pode ser amanhã depois do almoço? meu email ana@exemplo.com"
    );

    expect(facts.name).toBe("Ana Silva");
    expect(facts.city).toBe("Recife");
    expect(facts.email).toBe("ana@exemplo.com");
    expect(facts.preferredTime).toContain("amanhã depois do almoço");
    expect(facts.intent).toBe("agendamento");
  });

  it("merges new facts without erasing existing memory", () => {
    const previous = normalizeAgentConversationalMemory(
      {
        promptId: 7,
        knownFacts: { name: "Carlos" },
        pendingFields: ["telefone"]
      },
      7
    );

    const merged = mergeAgentConversationalMemory(previous, {
      phone: "(11) 99999-8888",
      objective: "marcar horario"
    });

    expect(merged.knownFacts.name).toBe("Carlos");
    expect(merged.knownFacts.phone).toBe("(11) 99999-8888");
    expect(merged.currentObjective).toBe("marcar horario");
    expect(merged.pendingFields).not.toContain("telefone");
  });

  it("overwrites corrigible facts with newer user information", () => {
    const previous = normalizeAgentConversationalMemory(
      {
        promptId: 7,
        knownFacts: { email: "antigo@exemplo.com", preferredTime: "amanhã de manhã" }
      },
      7
    );

    const merged = mergeAgentConversationalMemory(previous, {
      email: "novo@exemplo.com",
      preferredTime: "amanhã depois do almoço"
    });

    expect(merged.knownFacts.email).toBe("novo@exemplo.com");
    expect(merged.knownFacts.preferredTime).toBe("amanhã depois do almoço");
  });

  it("tracks last assistant question and loop risk from recent turns", () => {
    const previous = normalizeAgentConversationalMemory({ promptId: 7 }, 7);
    const merged = mergeAgentConversationalMemory(previous, {}, {
      promptId: 7,
      recentTurns: [
        { fromMe: true, body: "Qual data você prefere?" },
        { fromMe: false, body: "amanhã" },
        { fromMe: true, body: "Qual data você prefere?" }
      ]
    });

    expect(merged.lastAssistantQuestion).toBe("Qual data você prefere");
    expect(merged.lastUserAnswer).toBe("amanhã");
    expect(merged.loopRisk).toBe("high");
  });

  it("parses natural periods with a date into approximate useful times", () => {
    const parsed = parseDateTimeFromText("pode ser amanhã depois do almoço");
    expect(parsed.matched).toBe(true);
    expect(parsed.date?.getHours()).toBe(14);
  });
});
