/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  page?: number;
  limit?: number;
  searchTerm?: string;
}

interface CampaignWithFlow {
  [key: string]: any;
  flow?: any;
}

interface Response {
  flow: CampaignWithFlow[];
  count: number;
  hasMore: boolean;
}

const FlowsCampaignGetDataService = async ({
  companyId,
  page = 1,
  limit = 999999999,
  searchTerm
}: Request): Promise<Response> => {
  try {
    if (!companyId) {
      throw new AppError("ID da empresa é obrigatório", 400);
    }

    // Construir condições de busca
    const whereConditions: any = {
      companyId
    };

    // Adicionar filtro de busca se fornecido
    if (searchTerm?.trim()) {
      whereConditions.name = {
        [Op.iLike]: `%${searchTerm.trim()}%`
      };
    }

    // Calcular offset
    const offset = (page - 1) * limit;

    // Buscar campanhas com paginação e relacionamentos
    const { count, rows } = await FlowCampaignModel.findAndCountAll({
      where: whereConditions,
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
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true
    });

    // Processar resultados
    const processedRows = rows.map(campaign => {
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

      return campaignData;
    });

    return {
      flow: processedRows,
      count,
      hasMore: count > (page * limit)
    };

  } catch (error) {
    console.error('Erro ao consultar campanhas de fluxo:', error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError("Erro interno ao buscar campanhas", 500);
  }
};

export default FlowsCampaignGetDataService;