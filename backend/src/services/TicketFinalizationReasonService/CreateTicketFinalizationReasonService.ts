/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import TicketFinalizationReason from "../../models/TicketFinalizationReason";

interface Request {
  name: string;
  description?: string;
  companyId: number;
}

const CreateTicketFinalizationReasonService = async ({
  name,
  description,
  companyId
}: Request): Promise<TicketFinalizationReason> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    description: Yup.string().optional(),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate({ name, description, companyId });
  } catch (err) {
    throw new AppError(err.message);
  }

  const reasonExists = await TicketFinalizationReason.findOne({
    where: { name, companyId }
  });

  if (reasonExists) {
    throw new AppError("ERR_DUPLICATED_FINALIZATION_REASON");
  }

  const reason = await TicketFinalizationReason.create({
    name,
    description,
    companyId
  });

  return reason;
};

export default CreateTicketFinalizationReasonService;
