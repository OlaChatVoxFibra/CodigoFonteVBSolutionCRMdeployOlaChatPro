/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import ListService from "../services/AnnouncementService/ListService";
import CreateService from "../services/AnnouncementService/CreateService";
import ShowService from "../services/AnnouncementService/ShowService";
import UpdateService from "../services/AnnouncementService/UpdateService";
import DeleteService from "../services/AnnouncementService/DeleteService";
import FindService from "../services/AnnouncementService/FindService";

import Announcement from "../models/Announcement";
import AnnouncementAck from "../models/AnnouncementAck";
import logger from "../utils/logger";

import AppError from "../errors/AppError";
import { isDevNoDb } from "../helpers/devNoDbAuth";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  priority: string;
  title: string;
  text: string;
  status: string;
  companyId: number;
  mediaPath?: string;
  mediaName?: string;
};

type FindParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (isDevNoDb()) {
    return res.json({ records: [], count: 0, hasMore: false });
  }

  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    title: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId
  });

  logger.info({ msg: "announcement:create", id: record.id, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-announcement`, {
      action: "create",
      record
    });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;
  const schema = Yup.object().shape({
    title: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id
  });

  logger.info({ msg: "announcement:update", id, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-announcement`, {
      action: "update",
      record
    });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  logger.info({ msg: "announcement:delete", id, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-announcement`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Announcement deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (isDevNoDb()) {
    return res.status(200).json([]);
  }

  const params = req.query as FindParams;
  const records: Announcement[] = await FindService(params);

  return res.status(200).json(records);
};

export const getAnnouncementsForCompany = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (isDevNoDb()) {
    return res.json({ records: [], count: 0, hasMore: false });
  }

  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    userCompanyId: companyId // Novo parâmetro
  });

  logger.info({ msg: "announcement:list:company", companyId, count });

  return res.json({ records, count, hasMore });
};

export const acknowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (isDevNoDb()) {
    return res.status(200).json({ message: "ok" });
  }

  const { id } = req.params;
  const { companyId } = req.user;

  const announcement = await Announcement.findByPk(id);
  if (!announcement) {
    throw new AppError("ERR_NO_ANNOUNCEMENT_FOUND", 404);
  }
  if (announcement.targetCompanyId && Number(announcement.targetCompanyId) !== Number(companyId)) {
    throw new AppError("ERR_FORBIDDEN_ACK_TARGET_COMPANY", 403);
  }

  await AnnouncementAck.findOrCreate({
    where: { announcementId: Number(id), companyId },
    defaults: { announcementId: Number(id), companyId }
  });

  logger.info({ msg: "announcement:ack", id: Number(id), companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-announcement`, {
      action: "ack",
      id: Number(id)
    });

  return res.status(200).json({ message: "Announcement acknowledged" });
};

export const unacknowledge = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await AnnouncementAck.destroy({ where: { announcementId: Number(id), companyId } });
  const announcement = await Announcement.findByPk(id);
  if (announcement?.targetCompanyId && Number(announcement.targetCompanyId) !== Number(companyId)) {
    throw new AppError("ERR_FORBIDDEN_ACK_TARGET_COMPANY", 403);
  }

  logger.info({ msg: "announcement:unack", id: Number(id), companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-announcement`, {
      action: "unack",
      id: Number(id)
    });

  return res.status(200).json({ message: "Announcement unacknowledged" });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const announcement = await Announcement.findByPk(id);

    await announcement.update({
      mediaPath: file.filename.replace('/', '-'),
      mediaName: file.originalname.replace('/', '-')
    });
    await announcement.reload();

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-announcement`, {
        action: "update",
        record: announcement
      });

    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  try {
    const announcement = await Announcement.findByPk(id);

    const filePath = path.resolve("public", "announcements", announcement.mediaPath);

    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    await announcement.update({
      mediaPath: null,
      mediaName: null
    });
    await announcement.reload();

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-announcement`, {
        action: "update",
        record: announcement
      });

    return res.send({ mensagem: "Arquivo excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};
