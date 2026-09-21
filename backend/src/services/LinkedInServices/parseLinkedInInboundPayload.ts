/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface ParsedLinkedInInbound {
  senderUrn: string;
  senderName: string;
  body: string;
  messageId: string;
  conversationUrn?: string;
}

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickSenderUrn(obj: Record<string, unknown>): string {
  const from =
    obj.from ||
    obj.sender ||
    obj.actor ||
    obj.participant ||
    obj.member;
  if (typeof from === "string") return from;
  if (from && typeof from === "object") {
    const o = from as Record<string, unknown>;
    return pickString(o.urn, o.id, o.member, o.person);
  }
  return pickString(obj.senderUrn, obj.fromUrn, obj.actorUrn);
}

function pickBody(obj: Record<string, unknown>): string {
  const message = obj.message;
  if (message && typeof message === "object") {
    const m = message as Record<string, unknown>;
    const text = pickString(
      m.body,
      m.text,
      m.content,
      (m.body as any)?.text,
      (m.text as any)?.text
    );
    if (text) return text;
  }
  return pickString(obj.body, obj.text, obj.message, obj.content);
}

export function parseLinkedInInboundPayload(
  payload: unknown
): ParsedLinkedInInbound | null {
  if (!payload || typeof payload !== "object") return null;

  const root = payload as Record<string, unknown>;
  const candidates: Record<string, unknown>[] = [root];

  if (Array.isArray(root.events)) {
    for (const ev of root.events) {
      if (ev && typeof ev === "object") candidates.push(ev as Record<string, unknown>);
    }
  }
  if (root.data && typeof root.data === "object") {
    candidates.push(root.data as Record<string, unknown>);
  }
  if (root.event && typeof root.event === "object") {
    candidates.push(root.event as Record<string, unknown>);
  }

  for (const obj of candidates) {
    const body = pickBody(obj);
    const senderUrn = pickSenderUrn(obj);
    if (!body || !senderUrn) continue;

    const messageId = pickString(
      obj.messageId,
      obj.id,
      (obj.message as any)?.id,
      obj.eventId,
      `${senderUrn}_${Date.now()}`
    );

    const senderName = pickString(
      obj.senderName,
      obj.fromName,
      (obj.from as any)?.name,
      (obj.sender as any)?.name,
      senderUrn
    );

    return {
      senderUrn,
      senderName,
      body,
      messageId,
      conversationUrn: pickString(obj.conversationUrn, obj.conversation)
    };
  }

  return null;
}
