/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import DialogChatBots from "../../models/DialogChatBots";

const DeleteDialogChatBotsServices = async (
  contactId: number | string
): Promise<void> => {
  const queue = await DialogChatBots.findOne({
    where: {
      contactId
    }
  });

  if (queue) {
    await queue.destroy();
  }
};

export default DeleteDialogChatBotsServices;
