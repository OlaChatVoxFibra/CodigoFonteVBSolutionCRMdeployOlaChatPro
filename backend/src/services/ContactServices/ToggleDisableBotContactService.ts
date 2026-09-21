/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";

interface Request {
  contactId: string;
}

const ToggleDisableBotContactService = async ({
  contactId
}: Request): Promise<Contact> => {
  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "disableBot"]
  });

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  const disableBot = contact?.disableBot ? false : true;

  await contact.update({
    disableBot
  });

  await contact.reload({
    attributes: [
      "id",
      "name",
      "number",
      "email",
      "profilePicUrl",
      "companyId",
      "acceptAudioMessage",
      "disableBot",
      "urlPicture",
    ],
    include: ["extraInfo"]
  });

  return contact;
};

export default ToggleDisableBotContactService;
