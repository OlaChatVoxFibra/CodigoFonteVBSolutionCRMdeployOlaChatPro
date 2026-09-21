/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

interface Request {
  companyId: number;
  idFlow: number;
}

interface CampaignWithFlow {
  [key: string]: any;
  flow?: any;
}

interface Response {
  details: CampaignWithFlow;
}

const GetFlowsCampaignDataService = async ({
  companyId,
  idFlow
}: Request): Promise<Response> => {
  try {
    if (!idFlow || isNaN(Number(idFlow))) {
      throw new AppError("ID do fluxo de campanha é obrigatório e deve ser um número válido", 400);
    }

    // Buscar a campanha com relacionamentos
    const campaign = await FlowCampaignModel.findOne({
      where: {
        id: Number(idFlow),
        companyId
      },
      include: [
        {
          model: Whatsapp,
          as: 'whatsapp',
          attributes: ['id', 'name', 'status'],
          required: false
        },
        {
          model: FlowBuilderModel,
          as: 'flow',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    if (!campaign) {
      throw new AppError("Campanha não encontrada", 404);
    }

    // Converter para JSON e processar dados
    const campaignData: CampaignWithFlow = campaign.toJSON();

    // Garantir que as phrases estão no formato correto
    if (campaignData.phrase) {
      try {
        if (typeof campaignData.phrase === 'string') {
          campaignData.phrase = JSON.parse(campaignData.phrase);
        }
      } catch (error) {
        console.warn(`Erro ao parsear phrases da campanha ${campaign.id}:`, error);
        // Manter como array vazio se não conseguir parsear
        campaignData.phrase = [];
      }
    }

    return {
      details: campaignData
    };

  } catch (error) {
    console.error('Erro ao consultar campanha de fluxo:', error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError("Erro interno ao buscar campanha", 500);
  }
};

export default GetFlowsCampaignDataService;