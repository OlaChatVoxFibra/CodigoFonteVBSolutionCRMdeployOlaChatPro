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
  companyId: number;
  data: any;
}

export const UpdatePresetWebhookService = async ({
  id,
  companyId,
  data
}: Request): Promise<PresetWebhookModel> => {
  if (!companyId) {
    throw new AppError("CompanyId é obrigatório", 400);
  }

  const preset = await PresetWebhookModel.findOne({
    where: {
      id,
      companyId // Só pode editar presets da própria empresa
    }
  });

  if (!preset) {
    throw new AppError("Preset não encontrado ou sem permissão", 404);
  }

  // Presets do sistema não podem ser editados
  if (preset.isSystem) {
    throw new AppError("Presets do sistema não podem ser editados", 403);
  }

  // Verificar se novo nome já existe na empresa (se nome foi alterado)
  if (data.name && data.name !== preset.name) {
    const existingPreset = await PresetWebhookModel.findOne({
      where: {
        companyId,
        name: data.name,
        id: { [Op.ne]: id }
      }
    });

    if (existingPreset) {
      throw new AppError("Já existe um preset com este nome", 400);
    }
  }

  await preset.update(data);
  return preset;
};