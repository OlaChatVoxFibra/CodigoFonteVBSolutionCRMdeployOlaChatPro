/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { sendText } from "./graphAPI";
import formatBody from "../../helpers/Mustache";
import Whatsapp from "../../models/Whatsapp";
import { assertMetaSendAllowed } from "./resolveOutboundMetaTag";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

interface RequestWithoutTicket {
  body: string;
  number: string;
  whatsapp: Whatsapp;
}

const sendFacebookMessage = async ({ body, ticket, quotedMsg }: Request): Promise<any> => {
  const { number } = ticket.contact;
  try {
    const tag = await assertMetaSendAllowed(ticket);

    const send = await sendText(
      number,
      formatBody(body, ticket),
      ticket.whatsapp.facebookUserToken,
      tag
    );

    await ticket.update({ lastMessage: body, fromMe: true });

    return send;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    console.log(err);
    throw new AppError("ERR_SENDING_FACEBOOK_MSG");
  }
};

const sendFacebookMessageWithoutTicket = async ({ body, number, whatsapp }: RequestWithoutTicket): Promise<any> => {
  const { facebookUserToken } = whatsapp;
  try {
    const send = await sendText(number, body, facebookUserToken, null);
    return send;
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_SENDING_FACEBOOK_MSG");
  }
};

export { sendFacebookMessage, sendFacebookMessageWithoutTicket };
