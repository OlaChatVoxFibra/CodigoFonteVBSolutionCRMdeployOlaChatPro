/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const DEFAULT_QUEUE_ENTRY_MESSAGE =
  "Você está na fila *{{queue}}*. Em breve será atendido!";

export type ConnectionQueueEntryMode = "inherit" | "enabled" | "disabled";

export interface QueueEntryMessageInput {
  queueName: string;
  contactName?: string;
  position?: number;
  queueEntryMessage?: string | null;
  queueSendEntryMessage?: boolean | null;
  connectionSendQueueEntryMessage?: ConnectionQueueEntryMode | string | null;
  companySendQueuePosition?: string | null;
}

export function hasExplicitQueueEntryMessage(
  input: QueueEntryMessageInput & {
    connectionQueueEntryMessage?: string | null;
  }
): boolean {
  const connectionMode = String(
    input.connectionSendQueueEntryMessage || "inherit"
  ).toLowerCase();

  if (connectionMode === "disabled") {
    return false;
  }

  if (connectionMode === "enabled" && input.connectionQueueEntryMessage?.trim()) {
    return true;
  }

  return Boolean(input.queueEntryMessage?.trim());
}

export function resolveShouldSendQueueEntryMessage(
  input: QueueEntryMessageInput & {
    connectionQueueEntryMessage?: string | null;
  }
): boolean {
  const companyEnabled = input.companySendQueuePosition === "enabled";

  const connectionMode = String(
    input.connectionSendQueueEntryMessage || "inherit"
  ).toLowerCase() as ConnectionQueueEntryMode;

  if (connectionMode === "disabled") {
    return false;
  }

  const queueAllows = input.queueSendEntryMessage !== false;

  if (!hasExplicitQueueEntryMessage(input)) {
    return false;
  }

  if (connectionMode === "enabled") {
    return companyEnabled && queueAllows;
  }

  return companyEnabled && queueAllows;
}

export function resolveQueueEntryMessageTemplate(
  input: QueueEntryMessageInput & {
    connectionQueueEntryMessage?: string | null;
  }
): string {
  const connectionMode = String(
    input.connectionSendQueueEntryMessage || "inherit"
  ).toLowerCase();

  if (connectionMode === "enabled") {
    const connectionTemplate = input.connectionQueueEntryMessage?.trim();
    if (connectionTemplate) {
      return connectionTemplate;
    }
  }

  const queueTemplate = input.queueEntryMessage?.trim();
  if (queueTemplate) {
    return queueTemplate;
  }

  return DEFAULT_QUEUE_ENTRY_MESSAGE;
}

export function buildQueueEntryMessageText(
  input: QueueEntryMessageInput
): string {
  const template =
    (input.queueEntryMessage && String(input.queueEntryMessage).trim()) ||
    DEFAULT_QUEUE_ENTRY_MESSAGE;

  const position =
    input.position === undefined || input.position === null
      ? ""
      : String(input.position);

  return template
    .replace(/\{\{queue\}\}/g, input.queueName || "")
    .replace(/\{\{name\}\}/g, input.contactName || "")
    .replace(/\{\{position\}\}/g, position);
}
