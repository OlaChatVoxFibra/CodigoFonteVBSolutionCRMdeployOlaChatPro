/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import QuickMessage from "../../models/QuickMessage";
import AppError from "../../errors/AppError";
import QuickMessageComponent from "../../models/QuickMessageComponent";

const ShowService = async (id: string | number, companyId: number): Promise<QuickMessage> => {
  const record = await QuickMessage.findOne(
    { where: { id, companyId } ,
    include: [
      {
        model: QuickMessageComponent,
        as: 'components',
        attributes: ['id', 'type', 'text', 'buttons', 'format', 'example'],
        order: [['id', 'ASC']]
      }
    ]
  }
  );

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  return record;
};

export default ShowService;
