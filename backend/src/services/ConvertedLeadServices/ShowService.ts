/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ConvertedLead from "../../models/ConvertedLead";
import Contact from "../../models/Contact";
import User from "../../models/User";

const ShowService = async (id: number | string): Promise<ConvertedLead> => {
  const record = await ConvertedLead.findByPk(id as any, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "channel", "profilePicUrl", "urlPicture"]
      },
      {
        model: User,
        as: "responsible",
        attributes: ["id", "name"]
      }
    ]
  });
  if (!record) {
    throw new Error("Converted lead not found");
  }
  return record;
};

export default ShowService;
