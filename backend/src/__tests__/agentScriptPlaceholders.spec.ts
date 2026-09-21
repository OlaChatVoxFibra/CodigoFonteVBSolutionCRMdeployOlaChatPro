import { expandAgentScriptPlaceholders } from "../helpers/agentScriptPlaceholders";

describe("expandAgentScriptPlaceholders", () => {
  const ctx = {
    contactName: "Ana",
    agentName: "Bot Vendas",
    companyName: "ACME Ltda",
    phone: "5511999990000",
    now: new Date("2026-05-09T14:30:00.000Z")
  };

  it("substitui todas as chaves conhecidas", () => {
    const t =
      "Olá {nome_contato}, sou {nome_agente} da {nome_empresa}. Tel {telefone}. {ano}";
    const out = expandAgentScriptPlaceholders(t, ctx);
    expect(out).toContain("Ana");
    expect(out).toContain("Bot Vendas");
    expect(out).toContain("ACME Ltda");
    expect(out).toContain("5511999990000");
    expect(out).toContain("2026");
    expect(out).not.toContain("{nome_contato}");
    expect(out).not.toMatch(/\{[a-z_]+\}/i);
  });

  it("aceita alias nome_cliente", () => {
    expect(expandAgentScriptPlaceholders("Oi {nome_cliente}", ctx)).toBe("Oi Ana");
  });
});
