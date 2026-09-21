/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import TicketNote from "../../models/TicketNote";
import AppError from "../../errors/AppError";

const ShowTicketNoteService = async (
  id: string | number
): Promise<TicketNote> => {
  const ticketNote = await TicketNote.findByPk(id);

  if (!ticketNote) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  return ticketNote;
};

export default ShowTicketNoteService;
