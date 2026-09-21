/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import { FlowDefaultModel } from "../../models/FlowDefault";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  userId: number;
  companyId: number
  flowIdWelcome: number
  flowIdPhrase: number
  flowIdInactiveTime?: number
}

const CreateFlowDefaultService = async ({
  userId,
  companyId,
  flowIdWelcome,
  flowIdPhrase,
  flowIdInactiveTime
}: Request): Promise<FlowDefaultModel> => {
  try {
    const flow = await FlowDefaultModel.create({
      userId: userId,
      companyId: companyId,
      flowIdWelcome,
      flowIdNotPhrase: flowIdPhrase,
      flowIdInactiveTime
    });

    return flow;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default CreateFlowDefaultService;