/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FindOptions } from "sequelize/types";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Prompt from "../../models/Prompt";

interface Request {
  companyId: number;
  session?: number | string;
  channel?: string;
}

const ListFilterWhatsAppsService = async ({
  session,
  companyId,
  channel = "whatsapp"
}: Request): Promise<Whatsapp[]> => {
  const options: FindOptions = {
    where: {
      companyId,
      channel
    }
  };

  if (session !== undefined && session == 0) {
    options.attributes = { exclude: ["session"] };
  }

  const whatsapps = await Whatsapp.findAll(options);

  return whatsapps;
};



export default ListFilterWhatsAppsService;
