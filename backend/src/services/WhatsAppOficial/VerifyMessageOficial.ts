/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { generateVCard, IMessageReceived } from "./ReceivedWhatsApp";

const getTimestampMessage = (msgTimestamp: any) => {
    return msgTimestamp * 1
}

const verifyMessageOficial = async (
    message: IMessageReceived,
    ticket: Ticket,
    contact: Contact,
    companyId: number,
    fileName: string,
    fromNumber: string,
    data: any,
    quoteMessageId?: string
) => {

    let bodyMessage: any = message.text;

    if (message.type === "contacts" && Array.isArray(data?.message?.text?.contacts)) {
        const contact = data?.message?.text?.contacts[0];
        bodyMessage = await generateVCard(contact);
    }

    let quotedMsgId = null;

    if (quoteMessageId) {
        const quotedMessage = await Message.findOne({
            where: {
                wid: quoteMessageId,
                companyId: companyId
            }
        });
        quotedMsgId = quotedMessage?.id || null;
    }

    const messageData = {
        wid: message.idMessage,
        ticketId: ticket.id,
        contactId: contact.id,
        body: message.type === "contacts" ? bodyMessage : !!message.text ? message.text : '',
        fromMe: false,
        mediaType: message.type === "contacts" ? "contactMessage" : data.message.type,
        mediaUrl: fileName,
        // read: false,
        read: false,
        quotedMsgId: quotedMsgId,
        // ack: 2,
        ack: 0,
        channel: 'whatsapp_oficial',
        remoteJid: `${fromNumber}@s.whatsapp.net`,
        participant: null,
        dataJson: JSON.stringify(data),
        ticketTrakingId: null,
        isPrivate: false,
        createdAt: new Date(
            Math.floor(getTimestampMessage(message.timestamp) * 1000)
        ).toISOString(),
        ticketImported: null,
        isForwarded: false
    };

    // const io = getIO();

    // io.of(String(ticket.companyId))
    //     .emit(`company-${ticket.companyId}-appMessage`, {
    //         action: "create",
    //         message: messageData,
    //         ticket: ticket,
    //         contact: ticket.contact
    //     });

    await CreateMessageService({ messageData, companyId: companyId });
}

export default verifyMessageOficial;