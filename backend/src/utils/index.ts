/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../utils/logger";
import { ENABLE_LID_DEBUG } from "../config/debug";

/**
 * Normaliza JIDs de WhatsApp sem destruir @lid.
 * Converter @lid → @s.whatsapp.net faz o Baileys "aceitar" o envio
 * para um destino inexistente (checkmarks no CRM, zero entrega no celular).
 */
export function normalizeJid(jid: string): string {
  if (!jid) return jid;

  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] normalizeJid - Entrada: ${jid}`);
  }

  // Correção para contatos salvos incorretamente com @lid@s.whatsapp.net
  if (jid.includes("@lid@s.whatsapp.net")) {
    const parts = jid.split("@");
    if (parts.length >= 3 && /^\d+$/.test(parts[0])) {
      // Preferir LID nativo — o dígito à esquerda é ID interno, não telefone
      const normalized = `${parts[0]}@lid`;
      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] normalizeJid - Corrigido formato @lid@s.whatsapp.net → @lid: ${normalized}`
        );
      }
      return normalized;
    }
  }

  if (jid.includes("@s.whatsapp.net@s.whatsapp.net")) {
    const normalized = jid.replace(
      "@s.whatsapp.net@s.whatsapp.net",
      "@s.whatsapp.net"
    );
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
    }
    return normalized;
  }
  if (jid.includes("@g.us@g.us")) {
    const normalized = jid.replace("@g.us@g.us", "@g.us");
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] normalizeJid - Corrigido duplicado: ${normalized}`);
    }
    return normalized;
  }

  // LID nativo: preservar (Baileys entrega corretamente em @lid)
  if (jid.includes("@lid")) {
    const base = jid.split("@")[0]?.split(":")[0] || "";
    if (!/^\d+$/.test(base)) {
      if (ENABLE_LID_DEBUG) {
        logger.warn(`[RDS-LID] normalizeJid - Formato inválido para @lid: ${jid}`);
      }
      return jid;
    }
    const normalized = `${base}@lid`;
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] normalizeJid - Preservando @lid: ${normalized}`);
    }
    return normalized;
  }

  if (jid.includes("@s.whatsapp.net") || jid.includes("@g.us")) {
    // Remove sufixo de dispositivo (ex.: 5511...:12@s.whatsapp.net)
    const normalized = jid.replace(/:\d+@/, "@");
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] normalizeJid - JID PN/grupo: ${normalized}`);
    }
    return normalized;
  }

  if (!jid.includes("@")) {
    const normalized = `${jid}@s.whatsapp.net`;
    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] normalizeJid - Adicionado @s.whatsapp.net: ${normalized}`
      );
    }
    return normalized;
  }

  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] normalizeJid - Sem alteração: ${jid}`);
  }
  return jid;
}
