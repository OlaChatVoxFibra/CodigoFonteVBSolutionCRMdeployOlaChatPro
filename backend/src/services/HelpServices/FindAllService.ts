/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Help from "../../models/Help";

const FindAllService = async (): Promise<Help[]> => {
  const records: Help[] = await Help.findAll({
    order: [["title", "ASC"]]
  });
  return records;
};

export default FindAllService;
