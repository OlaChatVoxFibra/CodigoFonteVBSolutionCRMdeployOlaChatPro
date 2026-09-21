/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PresetWebhookModel } from "../../models/PresetWebhook";
import { Op } from "sequelize";

interface Request {
  companyId: number; // OBRIGATÓRIO para SaaS
  isActive?: boolean;
  provider?: string;
  includeSystem?: boolean; // Incluir presets do sistema
}

interface Response {
  presets: PresetWebhookModel[];
  count: number;
}

export const ListPresetWebhookService = async ({
  companyId,
  isActive = true,
  provider,
  includeSystem = true
}: Request): Promise<Response> => {
  try {
    if (!companyId) {
      throw new Error("CompanyId é obrigatório para listar presets");
    }

    const whereClause: any = {
      [Op.or]: []
    };
    
    // Sempre incluir presets da empresa
    const companyCondition: any = { companyId };
    
    if (isActive !== undefined) {
      companyCondition.isActive = isActive;
    }
    
    if (provider) {
      companyCondition.provider = provider;
    }
    
    whereClause[Op.or].push(companyCondition);
    
    // Incluir presets do sistema se solicitado
    if (includeSystem) {
      const systemCondition: any = { 
        companyId: null, 
        isSystem: true 
      };
      
      if (isActive !== undefined) {
        systemCondition.isActive = isActive;
      }
      
      if (provider) {
        systemCondition.provider = provider;
      }
      
      whereClause[Op.or].push(systemCondition);
    }

    const { count, rows } = await PresetWebhookModel.findAndCountAll({
      where: whereClause,
      order: [
        ['isSystem', 'DESC'], // Sistema primeiro
        ['companyId', 'ASC'],  // Depois por empresa
        ['name', 'ASC']        // Por fim alfabético
      ]
    });

    return {
      presets: rows,
      count
    };
  } catch (error) {
    console.error('Erro ao listar presets de webhook:', error);
    throw error;
  }
};