/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Campaign from "../../models/Campaign";

const FindAllService = async (): Promise<Campaign[]> => {
  const records: Campaign[] = await Campaign.findAll({
    order: [["name", "ASC"]]
  });
  return records;
};

export default FindAllService;
