/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PresetWebhookModel, PresetWebhookCreationAttributes } from "../../models/PresetWebhook";

interface CreateRequest extends Omit<PresetWebhookCreationAttributes, 'isSystem'> {
  companyId: number; // OBRIGATÓRIO
}

export const CreatePresetWebhookService = async (
  data: CreateRequest
): Promise<PresetWebhookModel> => {
  try {
    if (!data.companyId) {
      throw new Error("CompanyId é obrigatório para criar preset");
    }

    // Verificar se já existe preset com mesmo nome na empresa
    const existingPreset = await PresetWebhookModel.findOne({
      where: {
        companyId: data.companyId,
        name: data.name
      }
    });

    if (existingPreset) {
      throw new Error("Já existe um preset com este nome na empresa");
    }

    const preset = await PresetWebhookModel.create({
      ...data,
      isSystem: false // Presets criados por empresas nunca são do sistema
    });
    
    return preset;
  } catch (error) {
    console.error('Erro ao criar preset de webhook:', error);
    throw error;
  }
};
