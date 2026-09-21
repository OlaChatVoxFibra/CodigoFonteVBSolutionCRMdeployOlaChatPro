/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import ContactWallet from "../../models/ContactWallet";
import Queue from "../../models/Queue";
import User from "../../models/User";

const ShowContactService = async (
  id: string | number,
  companyId: number,
  requestUserId?: number
): Promise<Contact> => {
  const contact = await Contact.findByPk(id, {
    include: ["extraInfo", "tags",
      {
        association: "wallets",
        attributes: ["id", "name"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "expiresTicket", "groupAsTicket", "color"]
      },
      {
        model: ContactWallet,
        include: [
          {
            model: User,
            attributes: ["id", "name"]
          },
          {
            model: Queue,
            attributes: ["id", "name"]
          }
        ]
      },
    ]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  let requestUser: User | null = null;
  if (requestUserId) {
    requestUser = await User.findByPk(requestUserId);
  }

  if (!requestUser?.super && contact.companyId !== companyId) {
    throw new AppError("Não é possível consultar registros de outra empresa");
  }

  return contact;
};

export default ShowContactService;
