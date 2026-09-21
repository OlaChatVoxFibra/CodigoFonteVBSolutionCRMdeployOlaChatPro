/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PresetWebhookModel } from "../../models/PresetWebhook";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";

interface Request {
  id: number;
  companyId: number; // OBRIGATÓRIO para verificar ownership
}

export const GetPresetWebhookService = async ({ 
  id, 
  companyId 
}: Request): Promise<PresetWebhookModel> => {
  try {
    if (!companyId) {
      throw new AppError("CompanyId é obrigatório", 400);
    }

    const preset = await PresetWebhookModel.findOne({
      where: {
        id,
        [Op.or]: [
          { companyId }, // Preset da empresa
          { companyId: null, isSystem: true } // Ou preset do sistema
        ]
      }
    });
    
    if (!preset) {
      throw new AppError("Preset de webhook não encontrado ou sem permissão", 404);
    }

    return preset;
  } catch (error) {
    console.error('Erro ao buscar preset de webhook:', error);
    throw error;
  }
};