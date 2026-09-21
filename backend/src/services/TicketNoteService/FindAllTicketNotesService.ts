/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import TicketNote from "../../models/TicketNote";

const FindAllTicketNotesService = async (): Promise<TicketNote[]> => {
  const ticketNote = await TicketNote.findAll();
  return ticketNote;
};

export default FindAllTicketNotesService;
