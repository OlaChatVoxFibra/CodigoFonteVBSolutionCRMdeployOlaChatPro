/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  id: number;
}

const DuplicateFlowBuilderService = async ({
  id
}: Request): Promise<FlowBuilderModel> => {
  try {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: id
      }
    });

    const duplicate = await FlowBuilderModel.create({
      name: flow.name + " - copy",
      flow: flow.flow,
      user_id: flow.user_id,
      company_id: flow.company_id
    });

    return duplicate;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error;
  }
};

export default DuplicateFlowBuilderService;
