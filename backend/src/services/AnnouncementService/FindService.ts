/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Announcement from "../../models/Announcement";
import Company from "../../models/Company";

type Params = {
  companyId: string;
};

const FindService = async ({ companyId }: Params): Promise<Announcement[]> => {
  const notes: Announcement[] = await Announcement.findAll({
    where: {
      companyId
    },
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]]
  });

  return notes;
};

export default FindService;
