import { clipPrematureAssistantProgressAfterQuestion } from "../helpers/whatsappAssistantSingleTurnReply";

describe("clipPrematureAssistantProgressAfterQuestion", () => {
  it("remove parágrafo que antecipa resposta após pergunta (caso típico do print)", () => {
    const s = [
      "Olá! Seja bem-vindo à Pousada do Golfinho 🐬",
      "Vou te ajudar a encontrar a melhor hospedagem aqui no Bessa!",
      "Me conta: para qual data você está pensando em viajar?",
      "Perfeito 😊 Vou verificar as melhores opções para esse período."
    ].join("\n\n");
    const out = clipPrematureAssistantProgressAfterQuestion(s);
    expect(out).not.toMatch(/Perfeito/i);
    expect(out).toMatch(/qual data/i);
  });

  it("mantém parágrafos úteis após pergunta (ex.: link ou instrução)", () => {
    const s = [
      "Qual dia você prefere?",
      "Segue o link do calendário: https://exemplo.com/agenda"
    ].join("\n\n");
    expect(clipPrematureAssistantProgressAfterQuestion(s)).toContain("https://");
  });

  it("não altera texto sem pergunta", () => {
    const s = "Só passando o horário de check-in: 14h.";
    expect(clipPrematureAssistantProgressAfterQuestion(s)).toBe(s);
  });

  it("remove antecipação quando a LLM usa só \\n entre frases (um parágrafo lógico)", () => {
    const s = [
      "Olá! Seja bem-vindo à Pousada do Golfinho 🐬",
      "Vou te ajudar a encontrar a melhor hospedagem aqui no Bessa!",
      "Me conta: para qual data você está pensando em viajar?",
      "Perfeito 😊 Vou verificar as melhores opções para esse período."
    ].join("\n");
    const out = clipPrematureAssistantProgressAfterQuestion(s);
    expect(out).not.toMatch(/Perfeito/i);
    expect(out).toMatch(/qual data/i);
    expect(out.endsWith("?")).toBe(true);
  });

  it("remove 'vou registrar preferência/período' após pergunta (caso relatado em produção)", () => {
    const s = [
      "Me conta: para qual data você está pensando em viajar?",
      "Perfeito 😊",
      "Vou registrar sua preferência de período para hospedagem."
    ].join("\n\n");
    const out = clipPrematureAssistantProgressAfterQuestion(s);
    expect(out).not.toMatch(/registrar sua preferência/i);
    expect(out).toMatch(/qual data/i);
  });
});
