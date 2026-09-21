/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";

const GetWhatsappWbot = async (whatsapp: Whatsapp) => {
  const wbot = await getWbot(whatsapp.id);
  return wbot;
};

export default GetWhatsappWbot;
