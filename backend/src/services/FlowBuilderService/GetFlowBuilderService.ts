/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WebhookModel } from "../../models/Webhook";
import User from "../../models/User";
import { FlowBuilderModel } from "../../models/FlowBuilder";

interface Request {
  companyId: number;
  idFlow: number
}

interface Response {
  flow: FlowBuilderModel
}

const GetFlowBuilderService = async ({
  companyId,
  idFlow
}: Request): Promise<Response> => {
  
    try {
    
        // Realiza a consulta com paginação usando findAndCountAll
        const { count, rows } = await FlowBuilderModel.findAndCountAll({
          where: {
            company_id: companyId,
            id: idFlow
          }
        });
        let flow = rows[0]

        return {
            flow: flow
        }
      } catch (error) {
        console.error('Erro ao consultar usuários:', error);
      }
};

export default GetFlowBuilderService;
