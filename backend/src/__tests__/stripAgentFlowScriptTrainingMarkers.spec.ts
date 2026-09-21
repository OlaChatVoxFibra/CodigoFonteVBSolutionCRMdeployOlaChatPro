import { stripAgentFlowScriptTrainingMarkers } from "../helpers/stripAgentFlowScriptTrainingMarkers";

describe("stripAgentFlowScriptTrainingMarkers", () => {
  it("mantém só a abertura antes do primeiro EXEMPLO (não envia fala do lead)", () => {
    const s = `
# ETAPA 1 — ABERTURA

Mensagem:

Olá 👋
Vi que você demonstrou interesse.

Você quer usar ou revender?

---

EXEMPLO DE RESPOSTA DO LEAD:
"Quero revender"

RESPOSTA:

Perfeito 🚀
Segue o pitch.
`.trim();

    const out = stripAgentFlowScriptTrainingMarkers(s);
    expect(out).toContain("Olá");
    expect(out).toContain("revender");
    expect(out).not.toMatch(/quero revender/i);
    expect(out).not.toContain("Perfeito 🚀");
  });

  it("remove seção OBJEÇÕES inteira", () => {
    const s =
      "Olá\n\n# OBJEÇÕES\n\nEXEMPLO: x\nRESPOSTA: y".trim();
    const out = stripAgentFlowScriptTrainingMarkers(s);
    expect(out).toContain("Olá");
    expect(out).not.toContain("OBJEÇ");
  });

  it("em passo só com RESPOSTA + /comando, extrai corpo da RESPOSTA", () => {
    const s = `
EXEMPLO DE RESPOSTA DO LEAD:
dia 21/05

RESPOSTA:
/agendamento
Ótimo 👌
Link na hora.
`.trim();
    const out = stripAgentFlowScriptTrainingMarkers(s);
    expect(out).toContain("/agendamento");
    expect(out).toContain("Ótimo");
    expect(out).not.toContain("21/05");
  });

  it("fragmento só com EXEMPLO+RESPOSTA sem comando não inventa texto do lead", () => {
    const s = `
---

EXEMPLO DE RESPOSTA DO LEAD:
"Quero revender"

RESPOSTA:

Perfeito 🚀
Texto interno.
`.trim();
    const out = stripAgentFlowScriptTrainingMarkers(s);
    expect(out).not.toMatch(/quero revender/i);
    expect(out).not.toContain("Perfeito 🚀");
  });
});
