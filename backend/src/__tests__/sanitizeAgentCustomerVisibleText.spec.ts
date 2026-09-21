import { sanitizeAgentCustomerVisibleText } from "../helpers/sanitizeAgentCustomerVisibleText";

describe("sanitizeAgentCustomerVisibleText", () => {
  it("remove linhas só com separador ---", () => {
    expect(sanitizeAgentCustomerVisibleText("Olá\n---\nTudo bem?")).toBe("Olá\nTudo bem?");
  });

  it("remove cabeçalhos markdown e ETAPA curta", () => {
    expect(sanitizeAgentCustomerVisibleText("# Roteiro interno\nETAPA 1\nOi!")).toBe("Oi!");
  });
});
