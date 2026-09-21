/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";

const UpdateDeletedUserOpenTicketsStatus = async (
  tickets: Ticket[],
  companyId: number
): Promise<void> => {
  tickets.forEach(async t => {
    const ticketId = t.id.toString();

    await UpdateTicketService({
      ticketData: { status: "pending" },
      ticketId,
      companyId
    });
  });
};

export default UpdateDeletedUserOpenTicketsStatus;
