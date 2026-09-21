/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import CompanyKanbanConfig from "../../models/CompanyKanbanConfig";

interface Request {
  companyId: number;
  laneOrder: string[];
}

const SetKanbanLaneOrderService = async ({
  companyId,
  laneOrder,
}: Request): Promise<CompanyKanbanConfig> => {
  const [config, created] = await CompanyKanbanConfig.findOrCreate({
    where: {
      companyId,
    },
    defaults: {
      companyId,
      laneOrder: JSON.stringify(laneOrder),
    },
  });

  if (!created) {
    await config.update({ laneOrder: JSON.stringify(laneOrder) });
  }

  return config;
};

export default SetKanbanLaneOrderService;
