/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { getJidOf } from "../WbotServices/getJidOf";
import logger from "../../utils/logger";

interface Request {
    contactId: string;
    companyId: string | number;
    active: boolean
}

async function resolveWbotForContact(contact: Contact, companyId: number) {
    if (contact.whatsappId) {
        const wa = await Whatsapp.findByPk(contact.whatsappId);
        if (wa?.status === "CONNECTED") {
            return getWbot(wa.id);
        }
        logger.warn(
            `[BlockUnblock] Contato ${contact.id} whatsappId=${contact.whatsappId} não está CONNECTED; usando conexão padrão da empresa.`
        );
    }
    const defaultWa = await GetDefaultWhatsApp(Number(companyId));
    return getWbot(defaultWa.id);
}

const BlockUnblockContactService = async ({
    contactId,
    companyId,
    active
}: Request): Promise<Contact> => {
    const contact = await Contact.findByPk(contactId);

    if (!contact) {
        throw new AppError("ERR_NO_CONTACT_FOUND", 404);
    }

    const wbot = await resolveWbotForContact(contact, Number(companyId));
    const jid = getJidOf(contact);

    if (active) {
        try {
            await wbot.updateBlockStatus(jid, "unblock");
            await contact.update({ active: true });
        } catch (error: any) {
            logger.error(
                `[BlockUnblock] Falha ao desbloquear contato ${contactId} jid=${jid}:`,
                error?.message || error
            );
            throw new AppError("ERR_UNBLOCK_CONTACT", 400);
        }
    } else {
        try {
            await wbot.updateBlockStatus(jid, "block");
            await contact.update({ active: false });
        } catch (error: any) {
            logger.error(
                `[BlockUnblock] Falha ao bloquear contato ${contactId} jid=${jid}:`,
                error?.message || error
            );
            throw new AppError("ERR_BLOCK_CONTACT", 400);
        }
    }

    return contact;
};

export default BlockUnblockContactService;
