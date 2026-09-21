/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PresetWebhookModel } from "../../models/PresetWebhook";
import AppError from "../../errors/AppError";

interface Request {
  id: number;
  companyId: number;
}

export const DeletePresetWebhookService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  if (!companyId) {
    throw new AppError("CompanyId é obrigatório", 400);
  }

  const preset = await PresetWebhookModel.findOne({
    where: {
      id,
      companyId // Só pode deletar presets da própria empresa
    }
  });

  if (!preset) {
    throw new AppError("Preset não encontrado ou sem permissão", 404);
  }

  // Presets do sistema não podem ser deletados
  if (preset.isSystem) {
    throw new AppError("Presets do sistema não podem ser deletados", 403);
  }

  await preset.destroy();
};