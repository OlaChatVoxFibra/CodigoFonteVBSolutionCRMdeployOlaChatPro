/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactWallet from "../../models/ContactWallet";

interface Request {
  contactId: string;
  companyId: string | number;
}

interface Wallet {
  contactId: number | string;
  companyId: number | string;
}

const DeleteContactWalletService = async ({
  contactId,
  companyId
}: Request): Promise<Contact> => {

  await ContactWallet.destroy({
    where: {
      companyId,
      contactId
    }
  });

  const contact = await Contact.findOne({
    where: { id: contactId, companyId },
    attributes: ["id", "name", "number", "email", "profilePicUrl", "urlPicture", "companyId"],
    include: [
      "extraInfo",
      "tags",
      {
        association: "wallets",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return contact;
};

export default DeleteContactWalletService;
