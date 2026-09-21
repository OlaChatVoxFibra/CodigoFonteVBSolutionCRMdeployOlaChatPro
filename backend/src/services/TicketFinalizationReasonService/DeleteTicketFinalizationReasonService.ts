/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import TicketFinalizationReason from "../../models/TicketFinalizationReason";

interface Request {
  id: number;
  companyId: number;
}

const DeleteTicketFinalizationReasonService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  const reason = await TicketFinalizationReason.findOne({
    where: { id, companyId }
  });

  if (!reason) {
    throw new AppError("ERR_FINALIZATION_REASON_NOT_FOUND", 404);
  }

  await reason.destroy();
};

export default DeleteTicketFinalizationReasonService;
