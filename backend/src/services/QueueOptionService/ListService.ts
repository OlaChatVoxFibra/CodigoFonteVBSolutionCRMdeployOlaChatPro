/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WhereOptions } from "sequelize/types";
import QueueOption from "../../models/QueueOption";

type QueueOptionFilter = {
  queueId: string | number;
  queueOptionId: string | number;
  parentId: string | number | boolean;
};

const ListService = async ({ queueId, queueOptionId, parentId }: QueueOptionFilter): Promise<QueueOption[]> => {

  const whereOptions: WhereOptions = {};

  if (queueId) {
    whereOptions.queueId = queueId;
  }

  if (queueOptionId) {
    whereOptions.id = queueOptionId;
  }

  if (parentId == -1) {
    whereOptions.parentId = null;
  }

  if (Number(parentId) > 0) {
    whereOptions.parentId = parentId;
  }

  const queueOptions = await QueueOption.findAll({
    where: whereOptions,
    order: [["id", "ASC"]]
  });

  return queueOptions;
};

export default ListService;
