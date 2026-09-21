/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import TicketFinalizationReason from "../../models/TicketFinalizationReason";

interface Request {
  id: number;
  name?: string;
  description?: string;
  companyId: number;
}

const UpdateTicketFinalizationReasonService = async ({
  id,
  name,
  description,
  companyId
}: Request): Promise<TicketFinalizationReason> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    description: Yup.string().optional(),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate({ name, description, companyId });
  } catch (err) {
    throw new AppError(err.message);
  }

  const reason = await TicketFinalizationReason.findOne({
    where: { id, companyId }
  });

  if (!reason) {
    throw new AppError("ERR_FINALIZATION_REASON_NOT_FOUND", 404);
  }

  if (name && name !== reason.name) {
    const reasonExists = await TicketFinalizationReason.findOne({
      where: { name, companyId }
    });

    if (reasonExists) {
      throw new AppError("ERR_DUPLICATED_FINALIZATION_REASON");
    }
  }

  await reason.update({
    name: name || reason.name,
    description: description !== undefined ? description : reason.description
  });

  return reason;
};

export default UpdateTicketFinalizationReasonService;
