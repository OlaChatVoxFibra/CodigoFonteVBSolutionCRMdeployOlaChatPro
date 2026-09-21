/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Tags de envio Messenger (Facebook Page).
 * Instagram DM não usa MESSAGE_TAG neste fluxo.
 *
 * @see https://developers.facebook.com/docs/messenger-platform/send-messages/message-tags
 */
export type MetaMessageTag = "HUMAN_AGENT" | "ACCOUNT_UPDATE";

export type ResolveMetaMessageTagParams = {
  channel: string;
  lastInboundMessageAt: Date | null | undefined;
};

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * 24 * 60 * 60 * 1000;

/**
 * null = janela padrão (RESPONSE implícito, sem tag).
 * HUMAN_AGENT = atendimento humano até 7 dias após última mensagem do cliente.
 * ACCOUNT_UPDATE = fallback raro quando não há histórico inbound (evita falha silenciosa).
 */
export const resolveMetaMessageTag = ({
  channel,
  lastInboundMessageAt
}: ResolveMetaMessageTagParams): MetaMessageTag | null => {
  if (channel === "instagram") {
    return null;
  }

  if (!lastInboundMessageAt) {
    return "ACCOUNT_UPDATE";
  }

  const ageMs = Date.now() - new Date(lastInboundMessageAt).getTime();

  if (ageMs <= MS_24H) {
    return null;
  }

  if (ageMs <= MS_7D) {
    return "HUMAN_AGENT";
  }

  return null;
};

/** Fora da janela permitida pela Meta para envio ativo. */
export const isOutsideMetaSendWindow = (
  channel: string,
  lastInboundMessageAt: Date | null | undefined
): boolean => {
  if (!lastInboundMessageAt) {
    return false;
  }
  const ageMs = Date.now() - new Date(lastInboundMessageAt).getTime();
  if (channel === "instagram") {
    return ageMs > MS_24H;
  }
  if (channel === "facebook") {
    return ageMs > MS_7D;
  }
  return false;
};

/** Mensagem de erro amigável quando fora da janela de 7 dias. */
export const metaSendWindowError = (channel: string): string => {
  if (channel === "instagram") {
    return "Instagram: só é possível responder dentro da janela de mensagens da Meta (geralmente 24h após a última mensagem do cliente).";
  }
  return "Messenger: não é possível enviar após 7 dias da última mensagem do cliente.";
};
