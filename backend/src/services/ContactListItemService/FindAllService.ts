/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactListItem from "../../models/ContactListItem";

const FindAllService = async (): Promise<ContactListItem[]> => {
  const records: ContactListItem[] = await ContactListItem.findAll({
    order: [["name", "ASC"]]
  });
  return records;
};

export default FindAllService;
