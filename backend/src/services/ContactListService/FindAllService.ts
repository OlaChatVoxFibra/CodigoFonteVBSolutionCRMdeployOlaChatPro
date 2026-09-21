/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactList from "../../models/ContactList";

const FindAllService = async (): Promise<ContactList[]> => {
  const records: ContactList[] = await ContactList.findAll({
    order: [["name", "ASC"]]
  });
  return records;
};

export default FindAllService;
