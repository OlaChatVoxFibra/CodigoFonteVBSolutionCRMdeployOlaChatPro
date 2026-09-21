/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Message from "../../models/Message";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import CompaniesSettings from "../../models/CompaniesSettings";

const MarkDeleteWhatsAppMessage = async (from: any, timestamp?: any, msgId?: string, companyId?: number): Promise<Message> => {

    // ✅ CORREÇÃO: Verificar se from existe antes de usar replace
    if (from) {
        from = from.replace('@c.us', '').replace('@s.whatsapp.net', '');
    }

    if (msgId) {

        const messages = await Message.findAll({
            where: {
                wid: msgId,
                companyId
            }
        });

        // ✅ CORREÇÃO: Verificar se encontrou mensagens antes de acessar o array
        if (!messages || messages.length === 0) {
            console.log(`Mensagem não encontrada: ${msgId}`);
            return timestamp;
        }

        try {
            const messageToUpdate = await Message.findOne({
                where: {
                    wid: messages[0].wid,
                },
                include: [
                    "contact",
                    {
                        model: Message,
                        as: "quotedMsg",
                        include: ["contact"]
                    }
                ]
            });

            if (messageToUpdate) {
                const settings = await CompaniesSettings.findOne({
                    where: {
                        companyId: companyId
                    }
                });

                const ticket = await Ticket.findOne({
                    where: {
                        id: messageToUpdate.ticketId,
                        companyId
                    }
                });

                // ✅ CORREÇÃO: Verificar se settings existe antes de acessar propriedades
                if (settings && settings.lgpdDeleteMessage === "enabled" && settings.enableLGPD === "enabled") {
                    await messageToUpdate.update({ body: "🚫 _Mensagem Apagada_", isDeleted: true });
                } else {
                    await messageToUpdate.update({ isDeleted: true });
                }

                // ✅ CORREÇÃO: Verificar se ticket existe antes de acessar id
                if (ticket) {
                    await UpdateTicketService({ 
                        ticketData: { lastMessage: "🚫 _Mensagem Apagada_" }, 
                        ticketId: ticket.id, 
                        companyId 
                    });
                }

                const io = getIO();
                io.of(String(companyId))
                    // ✅ CORREÇÃO: Usar ticketId ao invés do objeto messageToUpdate
                    .emit(`appMessage-${messageToUpdate.ticketId}`, {
                        action: "update",
                        message: messageToUpdate
                    });
            }
        } catch (err) {
            console.log("Erro ao tentar marcar a mensagem como excluída:", err);
        }

        return timestamp;
    }

}

export default MarkDeleteWhatsAppMessage;
