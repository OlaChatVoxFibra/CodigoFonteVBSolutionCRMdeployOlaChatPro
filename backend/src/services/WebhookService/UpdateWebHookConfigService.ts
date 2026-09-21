/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  companyId: number;
  details: {};
  webhookId: number;
}

const UpdateWebHookConfigService = async ({
  companyId,
  details,
  webhookId
}: Request): Promise<String> => {
  try {

    const webhookOld = await WebhookModel.findOne({
      where: {
        company_id: companyId,
        id: webhookId
      }
    });

    const config = { ...webhookOld.config, details: details}

    const webhook = await WebhookModel.update({ config }, {
      where: {id: webhookId, company_id: companyId}
    });

    return 'ok';
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default UpdateWebHookConfigService;
