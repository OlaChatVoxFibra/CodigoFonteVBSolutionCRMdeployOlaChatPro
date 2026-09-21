/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import User from "../models/User";
import { PUBLIC_THEME_SETTING_KEYS } from "../constants/visualIdentity";
import { assertCanMutateVisualIdentitySettings } from "../helpers/visualIdentityPermissions";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ListSettingsServiceOne from "../services/SettingServices/ListSettingsServiceOne";
import { isDevNoDb } from "../helpers/devNoDbAuth";
import GetSettingService from "../services/SettingServices/GetSettingService";
import UpdateOneSettingService from "../services/SettingServices/UpdateOneSettingService";
import GetPublicSettingService from "../services/SettingServices/GetPublicSettingService";

type LogoRequest = {
  mode: string;
};

type PrivateFileRequest = {
  settingKey: string;
};

const THEME_KEYS_SET = new Set<string>(PUBLIC_THEME_SETTING_KEYS as unknown as string[]);

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  if (isDevNoDb()) {
    return res.status(200).json([]);
  }

  const settings = await ListSettingsService({ companyId });

  return res.status(200).json(settings);
};

export const showOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { settingKey: key } = req.params;

  const settingsTransfTicket = await ListSettingsServiceOne({
    companyId: companyId,
    key: key
  });

  return res.status(200).json(settingsTransfTicket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { settingKey: key } = req.params;
  const { value } = req.body;
  const { companyId } = req.user;

  if (THEME_KEYS_SET.has(key)) {
    await assertCanMutateVisualIdentitySettings(Number(req.user.id), companyId);
  }

  const setting = await UpdateSettingService({
    key,
    value,
    companyId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const getSetting = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey: key } = req.params;

  const setting = await GetSettingService({ key });

  return res.status(200).json(setting);
};

export const updateOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { settingKey: key } = req.params;
  const { value } = req.body;

  const setting = await UpdateOneSettingService({
    key,
    value
  });

  return res.status(200).json(setting);
};

export const publicShow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (isDevNoDb()) {
    return res.status(200).json(null);
  }
  const { settingKey: key } = req.params;
  const { companyId } = req.query;

  const targetCompanyId = companyId ? parseInt(companyId as string) : undefined;

  const settingValue = await GetPublicSettingService({
    key,
    companyId: targetCompanyId
  });

  return res.status(200).json(settingValue);
};

export const storeLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const file = req.file as Express.Multer.File;
  const { mode }: LogoRequest = req.body;
  const { companyId } = req.user;
  await assertCanMutateVisualIdentitySettings(Number(req.user.id), companyId);

  const validModes = [
    "Light",
    "Dark",
    "Favicon",
    "BackgroundLight",
    "BackgroundDark",
    "Tickets"
  ];

  if (validModes.indexOf(mode) === -1) {
    return res.status(406);
  }

  if (file && file.mimetype.startsWith("image/")) {
    const setting = await UpdateSettingService({
      key: `appLogo${mode}`,
      value: file.filename,
      companyId
    });

    return res.status(200).json(setting.value);
  }

  return res.status(406);
};

export const storePrivateFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const file = req.file as Express.Multer.File;
  const { settingKey }: PrivateFileRequest = req.body;
  const { companyId } = req.user;

  const setting = await UpdateSettingService({
    key: `_${settingKey}`,
    value: file.filename,
    companyId
  });

  return res.status(200).json(setting.value);
};
