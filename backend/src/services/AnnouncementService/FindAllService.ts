/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Announcement from "../../models/Announcement";

const FindAllService = async (): Promise<Announcement[]> => {
  const records: Announcement[] = await Announcement.findAll({
    order: [["createdAt", "DESC"]]
  });
  return records;
};

export default FindAllService;
