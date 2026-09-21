/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";
import Contact from "../../models/Contact";
import { normalizeJid } from "../../utils";

const GetProfilePicUrl = async (
  number: string,
  companyId: number,
  contact?: Contact,
): Promise<string> => {

  const normalizedNumber = normalizeJid(number);

  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const wbot = await getWbot(defaultWhatsapp.id);

  let profilePicUrl: string;
  try {
    profilePicUrl = await wbot.profilePictureUrl(contact && contact.isGroup ? contact.remoteJid : `${normalizedNumber}`, "image");
  } catch (error) {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  return profilePicUrl;
};

export default GetProfilePicUrl;
