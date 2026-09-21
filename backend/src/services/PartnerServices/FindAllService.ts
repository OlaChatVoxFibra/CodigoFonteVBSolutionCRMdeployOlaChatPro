/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Partner from "../../models/Partner";

const FindAllService = async (): Promise<Partner[]> => {
  const records: Partner[] = await Partner.findAll({
    order: [["name", "ASC"]]
  });
  return records;
};

export default FindAllService;
