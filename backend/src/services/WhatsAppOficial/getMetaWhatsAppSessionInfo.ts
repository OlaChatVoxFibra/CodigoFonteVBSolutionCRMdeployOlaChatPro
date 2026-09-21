/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Message from "../../models/Message";

const H24_MS = 24 * 60 * 60 * 1000;

export interface MetaWhatsAppSessionInfo {
  hasInbound: boolean;
  within24h: boolean;
  lastInboundAt: string | null;
  sessionExpiresAt: string | null;
  hoursRemaining: number | null;
  requiresTemplate: boolean;
}

export const getMetaWhatsAppSessionInfo = async (
  ticketId: number,
  companyId: number
): Promise<MetaWhatsAppSessionInfo> => {
  const lastInbound = await Message.findOne({
    where: { ticketId, fromMe: false },
    order: [["createdAt", "DESC"]],
    attributes: ["createdAt", "companyId"]
  });

  // companyId é opcional: mensagens antigas/importadas às vezes não batem e a janela 24h
  // era calculada como fechada → texto livre falhava na Meta.
  if (companyId && lastInbound?.companyId && Number(lastInbound.companyId) !== Number(companyId)) {
    const sameCompany = await Message.findOne({
      where: { ticketId, companyId, fromMe: false },
      order: [["createdAt", "DESC"]],
      attributes: ["createdAt"]
    });
    if (sameCompany) {
      return buildSessionFromDate(new Date(sameCompany.createdAt));
    }
  }

  if (!lastInbound) {
    return {
      hasInbound: false,
      within24h: false,
      lastInboundAt: null,
      sessionExpiresAt: null,
      hoursRemaining: null,
      requiresTemplate: true
    };
  }

  return buildSessionFromDate(new Date(lastInbound.createdAt));
};

function buildSessionFromDate(lastAt: Date): MetaWhatsAppSessionInfo {
  const expires = new Date(lastAt.getTime() + H24_MS);
  const now = Date.now();
  const within24h = now - lastAt.getTime() < H24_MS;
  const hoursRemaining = within24h
    ? Math.max(0, (expires.getTime() - now) / (60 * 60 * 1000))
    : null;

  return {
    hasInbound: true,
    within24h,
    lastInboundAt: lastAt.toISOString(),
    sessionExpiresAt: expires.toISOString(),
    hoursRemaining:
      hoursRemaining != null ? Math.round(hoursRemaining * 10) / 10 : null,
    requiresTemplate: !within24h
  };
}
