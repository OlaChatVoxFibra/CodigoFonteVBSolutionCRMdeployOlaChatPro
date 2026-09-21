/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/controllers/PresetWebhookController.ts
import { Request, Response } from "express";
import { ListPresetWebhookService } from "../services/PresetWebhookServices/ListPresetWebhookService";
import { GetPresetWebhookService } from "../services/PresetWebhookServices/GetPresetWebhookService";
import { CreatePresetWebhookService } from "../services/PresetWebhookServices/CreatePresetWebhookService";
import { UpdatePresetWebhookService } from "../services/PresetWebhookServices/UpdatePresetWebhookService";
import { DeletePresetWebhookService } from "../services/PresetWebhookServices/DeletePresetWebhookService";
import AppError from "../errors/AppError";

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { isActive, provider, includeSystem } = req.params;
  const companyId = req.user?.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const result = await ListPresetWebhookService({
    companyId,
    isActive: isActive ? isActive === 'true' : undefined,
    provider: provider as string,
    includeSystem: includeSystem !== 'false'
  });

  return res.status(200).json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const preset = await GetPresetWebhookService({
    id: parseInt(id),
    companyId
  });

  return res.status(200).json(preset);
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user?.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const presetData = {
    ...req.body,
    companyId
  };

  const preset = await CreatePresetWebhookService(presetData);

  return res.status(201).json(preset);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const preset = await UpdatePresetWebhookService({
    id: parseInt(id),
    companyId,
    data: req.body
  });

  return res.status(200).json(preset);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user?.companyId;

  if (!companyId) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  await DeletePresetWebhookService({
    id: parseInt(id),
    companyId
  });

  return res.status(200).json({ message: "Preset deletado com sucesso" });
};