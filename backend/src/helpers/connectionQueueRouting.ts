/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type ConnectionQueueMode = "direct" | "menu";

export const resolveConnectionQueueMode = ({
  queuesEnabled,
  queueCount
}: {
  queuesEnabled: boolean;
  queueCount: number;
}): ConnectionQueueMode => {
  if (!queuesEnabled || queueCount < 2) {
    return "direct";
  }
  return "menu";
};

export const shouldAutoAssignQueue = ({
  queuesEnabled,
  queueCount,
  hasMultiChatbot
}: {
  queuesEnabled: boolean;
  queueCount: number;
  hasMultiChatbot: boolean;
}): boolean => {
  if (queueCount < 1) {
    return false;
  }

  if (queuesEnabled === false || queueCount === 1) {
    return !hasMultiChatbot;
  }

  return false;
};

export const shouldSendConnectionGreeting = ({
  sendGreetingMessage,
  queuesEnabled,
  sendGreetingMessageOneQueues,
  greetingLength
}: {
  sendGreetingMessage: boolean;
  queuesEnabled: boolean;
  sendGreetingMessageOneQueues: string;
  greetingLength: number;
}): boolean => {
  if (greetingLength <= 1) {
    return false;
  }

  return (
    Boolean(sendGreetingMessage) ||
    (queuesEnabled === false &&
      sendGreetingMessageOneQueues === "enabled")
  );
};

export const shouldSendConnectionFarewell = ({
  sendFarewellMessage
}: {
  sendFarewellMessage: boolean;
}): boolean => Boolean(sendFarewellMessage);

export const shouldRequireMenuHeader = ({
  queuesEnabled,
  queueCount
}: {
  queuesEnabled: boolean;
  queueCount: number;
}): boolean => queuesEnabled && queueCount >= 2;

export const resolveWhatsappQueueIds = ({
  queuesEnabled,
  selectedQueueIds,
  systemQueueId
}: {
  queuesEnabled: boolean;
  selectedQueueIds: number[];
  systemQueueId: number;
}): number[] => (queuesEnabled ? selectedQueueIds : [systemQueueId]);
