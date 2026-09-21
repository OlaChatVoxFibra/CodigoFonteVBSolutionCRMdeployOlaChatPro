/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { delay, proto, WASocket } from "baileys";
import cacheLayer from "../libs/cache";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import logger from "../utils/logger";
import { setReadMessageWhatsAppOficial } from "../libs/whatsAppOficial/whatsAppOficial.service";
import { isExternalApiConfigured } from "../services/WhatsAppOficial/FinalizeWhatsAppOficialConnection";
import { markMetaCloudMessageRead } from "../services/WhatsAppOficial/markMetaCloudMessageRead";
import Whatsapp from "../models/Whatsapp";
import { getWbot } from "../libs/wbot";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {

  if (ticket.whatsappId) {
    // console.log("SETTING MESSAGES AS READ", ticket.whatsappId)
    const whatsapp = await Whatsapp.findOne({ where: { id: ticket.whatsappId, companyId: ticket.companyId } });

    if (["open", "group"].includes(ticket.status) && whatsapp && whatsapp.status === 'CONNECTED' && ticket.unreadMessages > 0) {
      try {
        // no baileys temos que marcar cada mensagem como lida
        // não o chat inteiro como é feito no legacy
        const getJsonMessage = await Message.findAll({
          where: {
            ticketId: ticket.id,
            fromMe: false,
            read: false
          },
          order: [["createdAt", "DESC"]]
        });

        if (['whatsapp_oficial'].includes(ticket.channel)) {
          const useDirect = !isExternalApiConfigured();
          getJsonMessage.forEach(async message => {
            if (useDirect && whatsapp) {
              await markMetaCloudMessageRead(whatsapp, message.wid);
            } else {
              setReadMessageWhatsAppOficial(whatsapp.token, message.wid);
            }
          });
        } else
          if (ticket.channel == 'whatsapp') {
            const wbot = await getWbot(ticket.whatsappId);

            if (getJsonMessage.length > 0) {

              getJsonMessage.forEach(async message => {
                const msg: proto.IWebMessageInfo = JSON.parse(message.dataJson);
                if (msg.key && msg.key.fromMe === false && !ticket.isBot && (ticket.userId || ticket.isGroup)) {

                  // if (wbot?.ws?.socket?._readyState !== 1) {
                  //   console.log("Aguardando socket Message as Read no MarkAsRead ", wbot?.ws?.socket?._readyState)
                  //   await delay(150);
                  // }

                  await wbot.readMessages([msg.key])
                }
              });
            }
          }

        await Message.update(
          { read: true },
          {
            where: {
              ticketId: ticket.id,
              read: false
            }
          }
        );

        await ticket.update({ unreadMessages: 0 });
        await cacheLayer.set(`contacts:${ticket.contactId}:unreads`, "0");

        const io = getIO();

        io.of(ticket.companyId.toString())
          // .to(ticket.status).to("notification")
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "updateUnread",
            ticketId: ticket.id
          });

      } catch (err) {
        logger.warn(
          `Could not mark messages as read. Maybe whatsapp session disconnected? Err: ${err}`
        );
      }

    }
  }

};

export default SetTicketMessagesAsRead;
