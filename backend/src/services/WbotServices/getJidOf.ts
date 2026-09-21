/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { Session } from "../../libs/wbot";
import { normalizeJid } from "../../utils";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";

const digitsOnly = (value: string): string =>
  String(value || "").replace(/\D/g, "");

const isPlausiblePhone = (digits: string): boolean =>
  digits.length >= 10 && digits.length <= 15;

const isLidAddress = (value?: string | null): boolean =>
  !!value && String(value).includes("@lid");

/**
 * remoteJid vindo de @lid convertido para @s.whatsapp.net costuma ser ID interno
 * (ex.: 10497118191705@...) e não o telefone real — Baileys dá timeout / não entrega.
 */
const remoteJidConflictsWithPhone = (
  remoteJid: string,
  phoneDigits: string,
  lid?: string | null
): boolean => {
  if (!remoteJid?.includes("@") || !isPlausiblePhone(phoneDigits)) {
    return false;
  }
  if (isLidAddress(remoteJid)) {
    return false;
  }
  const remoteDigits = digitsOnly(remoteJid.split("@")[0] || "");
  if (!remoteDigits || remoteDigits === phoneDigits) {
    return false;
  }
  if (lid && String(lid).trim() !== "") {
    return true;
  }
  return remoteDigits.length > 13;
};

const numberLooksLikeLidDigits = (
  phoneDigits: string,
  lid?: string | null
): boolean => {
  if (!phoneDigits) return false;
  const lidDigits = digitsOnly(String(lid || ""));
  if (lidDigits && lidDigits === phoneDigits) {
    return true;
  }
  // LIDs internos costumam ter > 13 dígitos; telefones BR com DDI ficam em 12–13
  return phoneDigits.length > 13;
};

const stripDeviceSuffix = (jid: string): string =>
  String(jid || "").replace(/:\d+@/, "@");

const jidFromContact = (contact: Contact, isGroup: boolean): string => {
  const suffix = isGroup ? "g.us" : "s.whatsapp.net";
  const phoneDigits = digitsOnly(contact.number);
  const lidRaw = String(contact.lid || "").trim();

  // Grupo: número/remoteJid do grupo
  if (isGroup) {
    if (contact.remoteJid?.includes("@g.us")) {
      return normalizeJid(contact.remoteJid);
    }
    return normalizeJid(`${phoneDigits}@g.us`);
  }

  // Preferir telefone real quando não for dígitos de LID
  if (isPlausiblePhone(phoneDigits) && !numberLooksLikeLidDigits(phoneDigits, lidRaw)) {
    if (
      contact.remoteJid &&
      !isLidAddress(contact.remoteJid) &&
      !remoteJidConflictsWithPhone(contact.remoteJid, phoneDigits, contact.lid)
    ) {
      const normalized = normalizeJid(contact.remoteJid);
      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] getJidOf - remoteJid alinhado ao número: ${normalized}`
        );
      }
      return normalized;
    }
    const fromNumber = normalizeJid(`${phoneDigits}@${suffix}`);
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] getJidOf - Usando número do contato: ${fromNumber}`);
    }
    return fromNumber;
  }

  // Sem telefone confiável: usar LID nativo (não converter para @s.whatsapp.net)
  if (isLidAddress(lidRaw)) {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] getJidOf - Usando LID nativo: ${lidRaw}`);
    }
    return normalizeJid(lidRaw);
  }

  if (lidRaw && /^\d+$/.test(lidRaw)) {
    const asLid = `${lidRaw}@lid`;
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] getJidOf - Montando LID nativo: ${asLid}`);
    }
    return asLid;
  }

  if (contact.remoteJid && contact.remoteJid.includes("@")) {
    return normalizeJid(contact.remoteJid);
  }

  if (phoneDigits) {
    // Último recurso: se parece LID, enviar como @lid
    if (numberLooksLikeLidDigits(phoneDigits, lidRaw)) {
      return `${phoneDigits}@lid`;
    }
    return normalizeJid(`${phoneDigits}@${suffix}`);
  }

  throw new Error("Contact without valid JID");
};

export function getJidOf(reference: string | Contact | Ticket): string {
  if (reference instanceof Contact) {
    return jidFromContact(reference, reference.isGroup);
  }

  if (reference instanceof Ticket) {
    if (!reference.contact) {
      throw new Error("Ticket without contact for JID resolution");
    }
    return jidFromContact(reference.contact, reference.isGroup);
  }

  if (typeof reference !== "string") {
    throw new Error("Invalid reference type");
  }

  if (reference.includes("@")) {
    return normalizeJid(reference);
  }

  const jid = `${reference}@s.whatsapp.net`;
  return normalizeJid(jid);
}

/**
 * JID de resposta a partir da mensagem inbound + contato.
 * Nunca preferir @lid quando existe telefone real (sender_pn / contact.number):
 * enviar só no LID costuma gravar no CRM e não entregar no celular.
 */
export function resolveReplyJid(
  msg: { key?: Record<string, any> | null } | null | undefined,
  contact?: Contact | null
): string {
  const key: any = msg?.key || {};
  const senderPn =
    key.senderPn ||
    key.sender_pn ||
    key.participantPn ||
    key.participant_pn ||
    key.peer_recipient_pn ||
    null;

  if (senderPn && String(senderPn).includes("@")) {
    const jid = normalizeJid(stripDeviceSuffix(String(senderPn)));
    logger.info(
      `[SEND] resolveReplyJid via senderPn: ${jid} (remoteJid=${key.remoteJid || "-"})`
    );
    return jid;
  }

  const phoneDigits = digitsOnly(contact?.number || "");
  if (
    contact &&
    !contact.isGroup &&
    isPlausiblePhone(phoneDigits) &&
    !numberLooksLikeLidDigits(phoneDigits, contact.lid)
  ) {
    const jid = normalizeJid(`${phoneDigits}@s.whatsapp.net`);
    logger.info(
      `[SEND] resolveReplyJid via contact.number: ${jid} (remoteJid=${key.remoteJid || "-"})`
    );
    return jid;
  }

  if (contact?.remoteJid && !isLidAddress(contact.remoteJid)) {
    return normalizeJid(contact.remoteJid);
  }

  const lidRaw = String(contact?.lid || "").trim();
  if (isLidAddress(lidRaw)) {
    logger.info(`[SEND] resolveReplyJid via contact.lid: ${lidRaw}`);
    return normalizeJid(lidRaw);
  }

  if (key.remoteJid) {
    const remote = String(key.remoteJid);
    // Se só temos @lid, usar nativo (não converter para telefone falso)
    if (isLidAddress(remote)) {
      logger.warn(
        `[SEND] resolveReplyJid fallback @lid sem PN: ${remote}`
      );
      return normalizeJid(remote);
    }
    return normalizeJid(stripDeviceSuffix(remote));
  }

  if (contact) {
    return getJidOf(contact);
  }

  throw new Error("Cannot resolve reply JID");
}

/**
 * Resolve o JID real para envio outbound.
 * Prioridade: senderPn da última inbound → telefone/onWhatsApp → LID nativo.
 */
export async function resolveOutboundJid(
  wbot: Session,
  contact: Contact,
  ticket: Ticket
): Promise<string> {
  const fullContact =
    contact?.number !== undefined
      ? contact
      : (await Contact.findByPk(ticket.contactId)) || contact;

  if (!fullContact) {
    throw new Error("Contact not found for outbound JID");
  }

  // 1) Última mensagem recebida — preferir sempre senderPn (telefone)
  try {
    const lastInbound = await Message.findOne({
      where: {
        ticketId: ticket.id,
        fromMe: false,
        remoteJid: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] }
      },
      order: [["createdAt", "DESC"]],
      attributes: ["remoteJid", "dataJson"]
    });

    if (lastInbound) {
      let senderPn: string | null = null;
      let inboundRemote = String(lastInbound.remoteJid || "");

      try {
        if (lastInbound.dataJson) {
          const parsed = JSON.parse(lastInbound.dataJson);
          const key = parsed?.key || {};
          senderPn =
            key.senderPn ||
            key.sender_pn ||
            key.participantPn ||
            key.participant_pn ||
            key.peer_recipient_pn ||
            null;
          if (key.remoteJid) {
            inboundRemote = String(key.remoteJid);
          }
        }
      } catch {
        // ignore
      }

      if (senderPn && String(senderPn).includes("@")) {
        const resolved = normalizeJid(stripDeviceSuffix(String(senderPn)));
        logger.info(
          `[SEND] JID outbound via senderPn ticket=${ticket.id}: ${resolved}`
        );
        try {
          const phone = digitsOnly(resolved.split("@")[0]);
          const updates: Record<string, string> = {};
          if (
            isPlausiblePhone(phone) &&
            !numberLooksLikeLidDigits(phone, fullContact.lid) &&
            fullContact.number !== phone
          ) {
            updates.number = phone;
          }
          if (resolved.includes("@s.whatsapp.net") && fullContact.remoteJid !== resolved) {
            updates.remoteJid = resolved;
          }
          if (isLidAddress(inboundRemote) && fullContact.lid !== inboundRemote) {
            updates.lid = normalizeJid(inboundRemote);
          }
          if (Object.keys(updates).length > 0) {
            await fullContact.update(updates);
          }
        } catch (persistErr: any) {
          logger.warn(
            `[SEND] Falha ao persistir contato: ${persistErr?.message || persistErr}`
          );
        }
        return resolved;
      }

      // Sem senderPn: se remoteJid já é PN, usar; se é @lid, NÃO retornar ainda —
      // cai no telefone/onWhatsApp abaixo (entrega real).
      if (
        inboundRemote.includes("@s.whatsapp.net") ||
        inboundRemote.includes("@g.us")
      ) {
        const resolved = normalizeJid(stripDeviceSuffix(inboundRemote));
        logger.info(
          `[SEND] JID outbound via remoteJid PN ticket=${ticket.id}: ${resolved}`
        );
        return resolved;
      }

      if (isLidAddress(inboundRemote) && fullContact.lid !== inboundRemote) {
        try {
          await fullContact.update({ lid: normalizeJid(inboundRemote) });
        } catch {
          // ignore
        }
      }
    }
  } catch (inboundErr: any) {
    logger.warn(
      `[SEND] Falha ao ler última inbound ticket ${ticket.id}: ${inboundErr?.message || inboundErr}`
    );
  }

  // 2) Telefone real via onWhatsApp
  const phoneDigits = digitsOnly(fullContact.number);
  const lidRaw = String(fullContact.lid || "").trim();

  if (
    !ticket.isGroup &&
    isPlausiblePhone(phoneDigits) &&
    !numberLooksLikeLidDigits(phoneDigits, lidRaw)
  ) {
    const phoneJid = `${phoneDigits}@s.whatsapp.net`;
    try {
      const ow = await wbot.onWhatsApp(phoneJid);
      if (ow?.[0]?.exists) {
        const rawJid = String((ow[0] as any).jid || phoneJid);
        const resolved = normalizeJid(stripDeviceSuffix(rawJid));
        const lidFromOw = (ow[0] as any).lid as string | undefined;

        const updates: Record<string, string> = {};
        if (fullContact.remoteJid !== resolved) {
          updates.remoteJid = resolved;
        }
        if (lidFromOw && fullContact.lid !== lidFromOw) {
          updates.lid = lidFromOw;
        }
        if (Object.keys(updates).length > 0) {
          await fullContact.update(updates);
        }

        logger.info(
          `[SEND] JID outbound via onWhatsApp ticket=${ticket.id}: ${resolved}`
        );
        return resolved;
      }
      logger.warn(
        `[SEND] onWhatsApp: número não existe (${phoneJid}) ticket=${ticket.id}`
      );
    } catch (owErr: any) {
      logger.warn(
        `[SEND] onWhatsApp falhou (${phoneJid}): ${owErr?.message || owErr}`
      );
    }
    // Mesmo sem onWhatsApp, preferir PN conhecido a @lid
    logger.info(
      `[SEND] JID outbound via telefone (sem confirmacao) ticket=${ticket.id}: ${phoneJid}`
    );
    return normalizeJid(phoneJid);
  }

  // 3) LID nativo / fallback
  const fallback = getJidOf(fullContact);
  logger.info(
    `[SEND] JID outbound via getJidOf ticket=${ticket.id}: ${fallback}`
  );
  return fallback;
}
