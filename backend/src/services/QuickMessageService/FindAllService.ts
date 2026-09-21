/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import QuickMessage from "../../models/QuickMessage";

const FindAllService = async (): Promise<QuickMessage[]> => {
  const records: QuickMessage[] = await QuickMessage.findAll({
    order: [["shortcode", "ASC"]]
  });
  return records;
};

export default FindAllService;
