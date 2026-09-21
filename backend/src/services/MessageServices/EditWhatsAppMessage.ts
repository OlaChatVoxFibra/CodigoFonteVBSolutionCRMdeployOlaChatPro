/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WASocket, WAMessage } from "baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
// import OldMessage from "../../models/OldMessage";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import Whatsapp from "../../models/Whatsapp";
import { getJidOf } from "../WbotServices/getJidOf";

interface Request {
  messageId: string;
  body: string;
}

const EditWhatsAppMessage = async ({
  messageId,
  body,
}: Request): Promise<{ ticket: Ticket, message: Message }> => {

  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact",
          {
            model: Whatsapp,
            attributes: ["id", "name", "groupAsTicket", "color"]
          },
        ]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;

  const wbot = await GetTicketWbot(ticket);

  const msg = JSON.parse(message.dataJson);

  try {
    await wbot.sendMessage(getJidOf(message.remoteJid), {
      text: body,
      edit: msg.key,
    }, {});


    // await OldMessage.upsert(oldMessage);
    await message.update({ body, isEdited: true });

    await ticket.update({ lastMessage: body });
    await ticket.reload();
    
    return { ticket: message.ticket, message: message };
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

};

export default EditWhatsAppMessage;
