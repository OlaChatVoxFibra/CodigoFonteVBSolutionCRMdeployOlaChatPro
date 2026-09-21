/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import TicketNote from "../../models/TicketNote";
import AppError from "../../errors/AppError";

const DeleteTicketNoteService = async (id: string): Promise<void> => {
  const ticketnote = await TicketNote.findOne({
    where: { id }
  });

  if (!ticketnote) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  await ticketnote.destroy();
};

export default DeleteTicketNoteService;
