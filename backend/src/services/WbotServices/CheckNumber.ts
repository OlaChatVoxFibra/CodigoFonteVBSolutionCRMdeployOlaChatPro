/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WASocket } from "baileys";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { Session } from "../../libs/wbot";

interface IOnWhatsapp {
  jid: string;
  exists: boolean;
  lid: string;
}

const toJid = (num: string) =>
  num.includes("@") ? num : `${num}@s.whatsapp.net`;

const checker = async (number: string, wbot: Session): Promise<IOnWhatsapp> => {
  const result = await wbot.onWhatsApp(toJid(number));

  if (!result) {
    logger.error({ number }, "Failed to check number on whatsapp");
    throw new AppError("ERR_INVALID_NUMBER", 400);
  }

  if (!result?.[0]?.exists) {
    throw new AppError("ERR_CHECK_NUMBER", 404);
  }

  const lid = (result as any).lid ?? null;

  return {
    jid: result[0]?.jid,
    exists: true,
    lid
  };
};

const CheckContactNumber = async (
  number: string,
  companyId: number,
  isGroup: boolean = false,
  userId?: number,
  whatsapp?: Whatsapp | null
): Promise<IOnWhatsapp> => {
  let whatsappList: Whatsapp | null = null;
  try {
    whatsappList = whatsapp || (await GetDefaultWhatsApp(companyId, userId));
  } catch (err: any) {
    if (String(err?.message || "").startsWith("ERR_NO_DEF_WAPP_FOUND")) {
      return { jid: toJid(number), exists: true, lid: null };
    }
    throw err;
  }

  if (whatsappList.channel === "whatsapp_oficial") {
    return { jid: toJid(number), exists: true, lid: null };
  }

  let wbot;
  try {
    wbot = await getWbot(whatsappList.id);
  } catch (err: any) {
    if (err?.message === "ERR_WAPP_NOT_INITIALIZED") {
      const digits = number.replace(/\D/g, "");
      return { jid: `${digits}@s.whatsapp.net`, exists: true, lid: null };
    }
    throw err;
  }

  if (isGroup) {
    const meta = await wbot.groupMetadata(number);
    return { jid: meta.id, exists: true, lid: null };
  }

  return checker(number, wbot);
};

export default CheckContactNumber;
