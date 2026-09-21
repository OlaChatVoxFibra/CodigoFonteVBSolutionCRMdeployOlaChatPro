/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import DialogChatBots from "../../models/DialogChatBots";

const ListDialogChatBotsServices = async (): Promise<DialogChatBots[]> => {
  const chatBot = await DialogChatBots.findAll({
    where: {
      queueId: {
        [Op.or]: [null]
      }
    },
    order: [["name", "ASC"]]
  });

  return chatBot;
};

export default ListDialogChatBotsServices;
