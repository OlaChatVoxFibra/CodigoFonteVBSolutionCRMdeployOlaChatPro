/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import QueueOption from "../../models/QueueOption";

const ShowService = async (queueOptionId: number | string): Promise<QueueOption> => {
  const queue = await QueueOption.findOne({
    where: {
      id: queueOptionId
    },
    include: [
      {
        model: QueueOption,
        as: 'parent',
        where: { parentId: queueOptionId },
        required: false
      },
    ]
  });

  if (!queue) {
    throw new AppError("ERR_QUEUE_NOT_FOUND");
  }

  return queue;
};

export default ShowService;
