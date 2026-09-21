/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Queue from "../../models/Queue";

interface Request {
  companyId: number;
}

const ListQueuesService = async ({ companyId }: Request): Promise<Queue[]> => {
  const queues = await Queue.findAll({
    where: {
      companyId
    },
    order: [["orderQueue", "ASC"]],
  });

  return queues;
};

export default ListQueuesService;
