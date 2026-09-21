/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Tag from "../../models/Tag";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import ShowContactService from "../ContactServices/ShowContactService";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { getIO } from "../../libs/socket";

interface Request {
  tags: Tag[];
  contactId: number;
  companyId: number;
}

const SyncTags = async ({
  tags,
  contactId,
  companyId
}: Request): Promise<Contact | null> => {

  const tagList = tags.map(t => ({ tagId: t.id, contactId }));

  await ContactTag.destroy({ where: { contactId } });
  await ContactTag.bulkCreate(tagList);

  const contact = await ShowContactService(contactId, companyId);

  const _ticket = await Ticket.findOne({ where: { contactId, status: { [Op.or]: ["open", "group"] } } });

  if (_ticket) {
    const ticket = await ShowTicketService(_ticket?.id, companyId);

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });
  }

  return contact;
};

export default SyncTags;
