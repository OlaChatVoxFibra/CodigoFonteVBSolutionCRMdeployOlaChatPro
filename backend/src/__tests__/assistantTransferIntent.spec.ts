import {
  assistantTextImpliesTransferToHuman,
  DEFAULT_TRANSFER_CUSTOMER_MESSAGE,
  resolveTransferCustomerMessage,
  truncateAssistantResponseAfterDeclaredTransfer,
  userConfirmsTransferAfterAgentOffer,
  userRequestsHumanTransfer
} from "../helpers/assistantTransferIntent";

describe("assistantTransferIntent", () => {
  it("detecta transferência em linguagem natural", () => {
    expect(assistantTextImpliesTransferToHuman("Irei transferir a conversa para um atendente.")).toBe(true);
    expect(assistantTextImpliesTransferToHuman("Vou encaminhar para um atendente verificar.")).toBe(true);
    expect(assistantTextImpliesTransferToHuman("Ação: Transferir para o setor de atendimento")).toBe(true);
  });

  it("não confunde com negação", () => {
    expect(assistantTextImpliesTransferToHuman("Não vou transferir agora.")).toBe(false);
  });

  it("não dispara só por mencionar atendente humano sem intenção de transferir", () => {
    expect(assistantTextImpliesTransferToHuman("Nosso atendente humano pode ajudar em horário comercial.")).toBe(
      false
    );
  });

  it("detecta pedido explícito do cliente", () => {
    expect(userRequestsHumanTransfer("Quero falar com um atendente humano")).toBe(true);
    expect(userRequestsHumanTransfer("me transfere por favor")).toBe(true);
    expect(userRequestsHumanTransfer("sim")).toBe(false);
  });

  it("confirma transferência só após oferta do agente", () => {
    const offer = "Ok, vou te transferir para um atendente.";
    expect(assistantTextImpliesTransferToHuman(offer)).toBe(true);
    expect(userConfirmsTransferAfterAgentOffer("sim", offer)).toBe(true);
    expect(userConfirmsTransferAfterAgentOffer("ok, pode transferir", offer)).toBe(true);
    expect(userConfirmsTransferAfterAgentOffer("sim", "Qual seu nome?")).toBe(false);
  });

  it("trunca blocos após declarar transferência", () => {
    const t =
      "Olá.\n\nIrei transferir a conversa para um atendente.\n\nO café da manhã é servido das 7h às 10h.";
    expect(truncateAssistantResponseAfterDeclaredTransfer(t)).not.toMatch(/café da manhã/i);
  });

  it("usa mensagem padrão quando ação não define texto", () => {
    expect(resolveTransferCustomerMessage({})).toBe(DEFAULT_TRANSFER_CUSTOMER_MESSAGE);
    expect(
      resolveTransferCustomerMessage({ responseMessage: "Aguarde na fila comercial." })
    ).toBe("Aguarde na fila comercial.");
    expect(
      resolveTransferCustomerMessage({}, "Mensagem salva na ação")
    ).toBe("Mensagem salva na ação");
  });
});
