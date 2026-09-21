/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import { WebhookModel } from "../../models/Webhook";

const DeleteWebHookService = async (id: string): Promise<WebhookModel> => {
  const webhook = await WebhookModel.findOne({
    where: { id }
  });

  if (!webhook) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  await webhook.destroy();

  return webhook;
};

export default DeleteWebHookService;

