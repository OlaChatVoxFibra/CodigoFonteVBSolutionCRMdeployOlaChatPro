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
}

interface Response {
  flows: FlowBuilderModel[];
}

const ListFlowBuilderService = async ({
  companyId,
}: Request): Promise<Response> => {
  
    try {
    
        // Realiza a consulta com paginação usando findAndCountAll
        const { count, rows } = await FlowBuilderModel.findAndCountAll({
          where: {
            company_id: companyId
          }
        });
    
        const flowResult = []
        rows.forEach((flow) => {
          flowResult.push(flow.toJSON());
        });

        return {
            flows: flowResult,
        }
      } catch (error) {
        console.error('Erro ao consultar usuários:', error);
      }
};

export default ListFlowBuilderService;
