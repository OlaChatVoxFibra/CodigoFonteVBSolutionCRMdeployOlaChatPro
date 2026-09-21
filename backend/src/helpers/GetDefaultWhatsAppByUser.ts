/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";

const GetDefaultWhatsAppByUser = async (
  userId: number
): Promise<Whatsapp | null> => {
  const user = await User.findByPk(userId, {include: ["whatsapp"]});
  if( user === null || !user.whatsapp) {
    return null;
  }

  // logger.info(`Found whatsapp linked to user '${user.name}' is '${user.whatsapp.name}'.`);

  return user.whatsapp;
};

export default GetDefaultWhatsAppByUser;
