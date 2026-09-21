/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import QueueIntegrations from "../../models/QueueIntegrations";
import AppError from "../../errors/AppError";

const DeleteQueueIntegrationService = async (id: string): Promise<void> => {
  const dialogflow = await QueueIntegrations.findOne({
    where: { id }
  });

  if (!dialogflow) {
    throw new AppError("ERR_NO_DIALOG_FOUND", 404);
  }

  await dialogflow.destroy();
};

export default DeleteQueueIntegrationService;