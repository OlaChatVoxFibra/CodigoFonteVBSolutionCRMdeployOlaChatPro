/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactList from "../../models/ContactList";
import Company from "../../models/Company";

type Params = {
  companyId: string;
};

const FindService = async ({ companyId }: Params): Promise<ContactList[]> => {
  const notes: ContactList[] = await ContactList.findAll({
    where: {
      companyId
    },
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["name", "ASC"]]
  });

  return notes;
};

export default FindService;
