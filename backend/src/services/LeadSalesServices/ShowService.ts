/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import LeadSale from "../../models/LeadSale";
import Contact from "../../models/Contact";
import User from "../../models/User";

const ShowService = async (id: number | string): Promise<LeadSale> => {
  const record = await LeadSale.findByPk(id as any, {
    include: [
      { model: Contact, attributes: ["id", "name", "number", "profilePicUrl"] },
      { model: User, attributes: ["id", "name"] }
    ]
  });
  if (!record) {
    throw new Error("Lead sale not found");
  }
  return record;
};

export default ShowService;
