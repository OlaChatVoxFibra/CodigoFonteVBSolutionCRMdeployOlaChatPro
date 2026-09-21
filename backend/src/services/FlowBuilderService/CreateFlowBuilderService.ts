/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  userId: number;
  name: string;
  companyId: number
}

const CreateFlowBuilderService = async ({
  userId,
  name,
  companyId
}: Request): Promise<FlowBuilderModel | string> => {
  try {
    
    const nameExist = await FlowBuilderModel.findOne({
      where: {
        name,
        company_id: companyId
      }
    })


    if(nameExist){
      return 'exist'
    }

    const flow = await FlowBuilderModel.create({
      user_id: userId,
      company_id: companyId,
      name: name,
    });

    return flow;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default CreateFlowBuilderService;
