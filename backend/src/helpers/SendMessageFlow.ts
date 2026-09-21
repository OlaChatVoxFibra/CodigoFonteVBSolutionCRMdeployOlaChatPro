/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import fs from "fs";

import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import { getJidOf } from "../services/WbotServices/getJidOf";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
};

export const SendMessageFlow = async (
  whatsapp: Whatsapp,
  messageData: MessageData,
  isFlow: boolean = false,
  isRecord: boolean = false
): Promise<any> => {
  try {
    const wbot = await GetWhatsappWbot(whatsapp);
    const chatId = `${messageData.number}@s.whatsapp.net`;

    let message;

    const templateButtons = [
      { index: 1, urlButton: { displayText: '⭐ Star Baileys on GitHub!', url: 'https://github.com/adiwajshing/Baileys' } },
      { index: 2, callButton: { displayText: 'Call me!+1 (234) 5678-901' } },
      { index: 3, quickReplyButton: { displayText: 'This is a reply, just like normal buttons!', id: 'id-like-buttons-message' } },
    ]

    const body = `\u200e${messageData.body}`;

    //@ts-ignore
    message = await wbot.sendMessage(getJidOf(chatId), { text: body, templateButtons: templateButtons });


    return message;
  } catch (err: any) {
    throw new Error(err);
  }
};
