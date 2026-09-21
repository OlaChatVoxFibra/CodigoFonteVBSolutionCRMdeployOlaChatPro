/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chatbot from "../../models/Chatbot";
import DialogChatBots from "../../models/DialogChatBots";

const ShowDialogChatBotsServices = async (
  contactId: number | string
): Promise<DialogChatBots | void> => {
  const dialog = await DialogChatBots.findOne({
    where: {
      contactId
    },
    include: [
      {
        model: Chatbot,
        as: "chatbots",
        order: [[{ model: Chatbot, as: "chatbots" }, "id", "ASC"]]
      }
    ]
  });

  return dialog;
};

export default ShowDialogChatBotsServices;
