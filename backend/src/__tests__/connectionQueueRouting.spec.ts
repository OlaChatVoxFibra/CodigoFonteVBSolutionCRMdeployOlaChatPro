import {
  resolveConnectionQueueMode,
  resolveWhatsappQueueIds,
  shouldAutoAssignQueue,
  shouldRequireMenuHeader,
  shouldSendConnectionFarewell,
  shouldSendConnectionGreeting
} from "../helpers/connectionQueueRouting";

describe("connectionQueueRouting", () => {
  describe("resolveConnectionQueueMode", () => {
    it("modo direto quando filas desabilitadas", () => {
      expect(
        resolveConnectionQueueMode({ queuesEnabled: false, queueCount: 1 })
      ).toBe("direct");
    });

    it("modo direto com uma fila habilitada", () => {
      expect(
        resolveConnectionQueueMode({ queuesEnabled: true, queueCount: 1 })
      ).toBe("direct");
    });

    it("modo menu com duas ou mais filas", () => {
      expect(
        resolveConnectionQueueMode({ queuesEnabled: true, queueCount: 2 })
      ).toBe("menu");
    });
  });

  describe("shouldAutoAssignQueue", () => {
    it("auto-atribui com filas off", () => {
      expect(
        shouldAutoAssignQueue({
          queuesEnabled: false,
          queueCount: 1,
          hasMultiChatbot: false
        })
      ).toBe(true);
    });

    it("auto-atribui com uma fila", () => {
      expect(
        shouldAutoAssignQueue({
          queuesEnabled: true,
          queueCount: 1,
          hasMultiChatbot: false
        })
      ).toBe(true);
    });

    it("não auto-atribui com menu de filas", () => {
      expect(
        shouldAutoAssignQueue({
          queuesEnabled: true,
          queueCount: 2,
          hasMultiChatbot: false
        })
      ).toBe(false);
    });
  });

  describe("shouldSendConnectionGreeting", () => {
    it("não envia sem toggle e sem legado", () => {
      expect(
        shouldSendConnectionGreeting({
          sendGreetingMessage: false,
          queuesEnabled: false,
          sendGreetingMessageOneQueues: "disabled",
          greetingLength: 10
        })
      ).toBe(false);
    });

    it("envia com toggle de saudação", () => {
      expect(
        shouldSendConnectionGreeting({
          sendGreetingMessage: true,
          queuesEnabled: false,
          sendGreetingMessageOneQueues: "disabled",
          greetingLength: 10
        })
      ).toBe(true);
    });

    it("envia no modo simples com legado habilitado", () => {
      expect(
        shouldSendConnectionGreeting({
          sendGreetingMessage: false,
          queuesEnabled: false,
          sendGreetingMessageOneQueues: "enabled",
          greetingLength: 10
        })
      ).toBe(true);
    });
  });

  describe("shouldSendConnectionFarewell", () => {
    it("respeita toggle de despedida", () => {
      expect(shouldSendConnectionFarewell({ sendFarewellMessage: false })).toBe(
        false
      );
      expect(shouldSendConnectionFarewell({ sendFarewellMessage: true })).toBe(
        true
      );
    });
  });

  describe("shouldRequireMenuHeader", () => {
    it("exige cabeçalho apenas com 2+ filas", () => {
      expect(
        shouldRequireMenuHeader({ queuesEnabled: true, queueCount: 2 })
      ).toBe(true);
      expect(
        shouldRequireMenuHeader({ queuesEnabled: true, queueCount: 1 })
      ).toBe(false);
      expect(
        shouldRequireMenuHeader({ queuesEnabled: false, queueCount: 3 })
      ).toBe(false);
    });
  });

  describe("resolveWhatsappQueueIds", () => {
    it("usa fila sistema quando filas desabilitadas", () => {
      expect(
        resolveWhatsappQueueIds({
          queuesEnabled: false,
          selectedQueueIds: [9, 10],
          systemQueueId: 1
        })
      ).toEqual([1]);
    });

    it("mantém filas selecionadas quando habilitadas", () => {
      expect(
        resolveWhatsappQueueIds({
          queuesEnabled: true,
          selectedQueueIds: [9, 10],
          systemQueueId: 1
        })
      ).toEqual([9, 10]);
    });
  });
});
