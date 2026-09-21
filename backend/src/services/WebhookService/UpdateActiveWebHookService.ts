/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  status: boolean;
  webhookId: number;
}

const UpdateActiveWebHookService = async ({
  status,
  webhookId
}: Request): Promise<String> => {
  try {

    const webhook = await WebhookModel.update({ active: status }, {
      where: {id: webhookId}
    });

    return 'ok';
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default UpdateActiveWebHookService;
