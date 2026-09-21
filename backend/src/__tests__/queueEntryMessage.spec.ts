import {
  buildQueueEntryMessageText,
  DEFAULT_QUEUE_ENTRY_MESSAGE,
  resolveQueueEntryMessageTemplate,
  resolveShouldSendQueueEntryMessage
} from "../helpers/queueEntryMessage";

describe("queueEntryMessage", () => {
  describe("resolveShouldSendQueueEntryMessage", () => {
    it("envia quando empresa habilitada, fila permite e há mensagem configurada", () => {
      expect(
        resolveShouldSendQueueEntryMessage({
          queueName: "Atendimento Padrão",
          queueEntryMessage: "Olá {{name}}, aguarde na fila {{queue}}",
          companySendQueuePosition: "enabled",
          queueSendEntryMessage: true,
          connectionSendQueueEntryMessage: "inherit"
        })
      ).toBe(true);
    });

    it("não envia mensagem padrão sem template explícito na fila ou conexão", () => {
      expect(
        resolveShouldSendQueueEntryMessage({
          queueName: "Atendimento Padrão",
          companySendQueuePosition: "enabled",
          queueSendEntryMessage: true,
          connectionSendQueueEntryMessage: "inherit"
        })
      ).toBe(false);
    });

    it("não envia quando conexão desabilita", () => {
      expect(
        resolveShouldSendQueueEntryMessage({
          queueName: "Suporte",
          companySendQueuePosition: "enabled",
          queueSendEntryMessage: true,
          connectionSendQueueEntryMessage: "disabled"
        })
      ).toBe(false);
    });

    it("não envia quando fila desabilita", () => {
      expect(
        resolveShouldSendQueueEntryMessage({
          queueName: "Suporte",
          companySendQueuePosition: "enabled",
          queueSendEntryMessage: false,
          connectionSendQueueEntryMessage: "inherit"
        })
      ).toBe(false);
    });

    it("não envia quando empresa desabilita posição na fila", () => {
      expect(
        resolveShouldSendQueueEntryMessage({
          queueName: "Suporte",
          companySendQueuePosition: "disabled",
          queueSendEntryMessage: true,
          connectionSendQueueEntryMessage: "enabled"
        })
      ).toBe(false);
    });
  });

  describe("buildQueueEntryMessageText", () => {
    it("substitui variáveis do template", () => {
      const text = buildQueueEntryMessageText({
        queueName: "Atendimento Padrão",
        contactName: "Maria",
        position: 3,
        queueEntryMessage: "Olá {{name}}, você está na fila {{queue}} (posição {{position}})"
      });
      expect(text).toBe(
        "Olá Maria, você está na fila Atendimento Padrão (posição 3)"
      );
    });

    it("usa mensagem padrão quando template vazio", () => {
      const text = buildQueueEntryMessageText({
        queueName: "Vendas",
        queueEntryMessage: ""
      });
      expect(text).toBe(
        DEFAULT_QUEUE_ENTRY_MESSAGE.replace("{{queue}}", "Vendas")
      );
    });
  });

  describe("resolveQueueEntryMessageTemplate", () => {
    it("usa mensagem da conexão quando habilitada", () => {
      expect(
        resolveQueueEntryMessageTemplate({
          queueName: "Suporte",
          queueEntryMessage: "Msg da fila",
          connectionSendQueueEntryMessage: "enabled",
          connectionQueueEntryMessage: "Olá {{name}}, fila {{queue}}"
        })
      ).toBe("Olá {{name}}, fila {{queue}}");
    });
  });
});
