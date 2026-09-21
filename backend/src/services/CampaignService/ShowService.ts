/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Campaign from "../../models/Campaign";
import AppError from "../../errors/AppError";
import CampaignShipping from "../../models/CampaignShipping";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import Queue from "../../models/Queue";

const ShowService = async (id: string | number): Promise<Campaign> => {
  const record = await Campaign.findByPk(id, {
    include: [
      // Removido CampaignShipping para evitar estouro de memória
      // Os dados de shipping serão carregados separadamente via endpoint dedicado
      { model: ContactList, include: [{ model: ContactListItem }] },
      { model: Whatsapp, attributes: ["id", "name", "color"] },
      { model: User, attributes: ["id", "name"] },
      { model: Queue, attributes: ["id", "name", "color"] },
    ]
  });

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  return record;
};

export default ShowService;
