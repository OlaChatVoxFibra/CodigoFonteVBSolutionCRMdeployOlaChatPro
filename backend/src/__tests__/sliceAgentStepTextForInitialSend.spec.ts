import {
  extractSlashCommandsFromTrainingTail,
  findAgendamentoSlugInStepScript,
  findTransferSlugInStepScript,
  matchScriptCommandSlugFromLine,
  sliceAgentStepTextForInitialSend,
  stepScriptMentionsAgendamentoCommand
} from "../helpers/agentScriptInitialSendSlice";

describe("sliceAgentStepTextForInitialSend", () => {
  it("remove bloco EXEMPLO… e RESPOSTA: (treinamento), mantendo só a Mensagem inicial", () => {
    const raw = `# ETAPA 1
Mensagem:
Olá! Bem-vindo 🐬
Me conta: qual data?
EXEMPLO DE RESPOSTA DO LEAD:
"20 de agosto"
RESPOSTA:
Perfeito 😊
Vou registrar sua preferência.
/agendamento`;
    const out = sliceAgentStepTextForInitialSend(raw);
    expect(out).toContain("qual data");
    expect(out).not.toMatch(/perfeito/i);
    expect(out).not.toMatch(/registrar sua prefer/i);
    expect(out).not.toMatch(/EXEMPLO/i);
    expect(out).not.toMatch(/\/agendamento/);
  });

  it("sem marcador EXEMPLO, não altera o corpo", () => {
    expect(sliceAgentStepTextForInitialSend("Apenas\numa\nmensagem")).toBe("Apenas\numa\nmensagem");
  });

  it("extractSlashCommandsFromTrainingTail lista /comandos após EXEMPLO", () => {
    const raw = `Mensagem:
Pergunta?
EXEMPLO DE RESPOSTA DO LEAD:
x
RESPOSTA:
ok
/agendar
/transferirchamado`;
    expect(extractSlashCommandsFromTrainingTail(raw)).toEqual(["agendar", "transferirchamado"]);
    expect(extractSlashCommandsFromTrainingTail("sem exemplo\n/agendar")).toEqual([]);
  });

  it("matchScriptCommandSlugFromLine aceita fim de linha e LRM do WhatsApp", () => {
    expect(matchScriptCommandSlugFromLine("Perfeito /agendamento")).toBe("agendamento");
    expect(matchScriptCommandSlugFromLine("\u200e /agendamento")).toBe("agendamento");
    expect(matchScriptCommandSlugFromLine("RESPOSTA: /transferirchamado")).toBe("transferirchamado");
    expect(matchScriptCommandSlugFromLine("https://site.com/agendamento")).toBeNull();
  });

  it("findAgendamentoSlugInStepScript encontra /agendar no tail após EXEMPLO", () => {
    const raw = `Pergunta data?
EXEMPLO DE RESPOSTA DO LEAD:
31/05
RESPOSTA:
/agendar`;
    expect(findAgendamentoSlugInStepScript(raw)).toBe("agendar");
    expect(stepScriptMentionsAgendamentoCommand(raw)).toBe(true);
  });

  it("findTransferSlugInStepScript encontra transferência no tail", () => {
    const raw = `Ok
EXEMPLO DE RESPOSTA DO LEAD:
sim
RESPOSTA:
/transferirchamado`;
    expect(findTransferSlugInStepScript(raw)).toBe("transferirchamado");
  });
});
