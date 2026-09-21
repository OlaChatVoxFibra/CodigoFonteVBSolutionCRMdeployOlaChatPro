/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Chatbot from "../../models/Chatbot";

const ListChatBotService = async (): Promise<Chatbot[]> => {
  const chatBot = await Chatbot.findAll({
    where: {
      queueId: {
        [Op.or]: [null]
      }
    },
    order: [["id", "ASC"]]
  });

  return chatBot;
};

export default ListChatBotService;
