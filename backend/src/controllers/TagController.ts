/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import multer from "multer";
import path from "path";
import fs from "fs";

import AppError from "../errors/AppError";

import CreateService from "../services/TagServices/CreateService";
import ListService from "../services/TagServices/ListService";
import UpdateService from "../services/TagServices/UpdateService";
import ShowService from "../services/TagServices/ShowService";
import DeleteService from "../services/TagServices/DeleteService";
import SimpleListService from "../services/TagServices/SimpleListService";
import SyncTagService from "../services/TagServices/SyncTagsService";
import KanbanListService from "../services/TagServices/KanbanListService";
import ContactTag from "../models/ContactTag";

// Configuração do multer para upload de mídia
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return cb(new Error('Company ID não encontrado'), '');
    }
    
    const uploadPath = path.join(__dirname, `../../public/company${companyId}/lanes`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `lane-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'video/mp4', 'video/avi', 'video/mov', 'video/webm',
      'application/x-ret'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

export const uploadMiddleware = upload.array('mediaFiles', 5); // Máximo 5 arquivos

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
  kanban?: number;
  tagId?: number;
  limit?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam, kanban, tagId, limit } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { tags, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    kanban,
    tagId,
    limit
  });

  return res.json({ tags, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, color, kanban,
    timeLane,
    nextLaneId,
    greetingMessageLane,
    rollbackLaneId } = req.body;
  const { companyId } = req.user;

  // Processar arquivos de mídia
  let mediaFilesData = null;
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const files = req.files as any[];
    mediaFilesData = JSON.stringify(files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/company${companyId}/lanes/${file.filename}`
    })));
  }

  const tag = await CreateService({
    name,
    color,
    kanban,
    companyId,
    timeLane,
    nextLaneId,
    greetingMessageLane,
    rollbackLaneId,
    mediaFiles: mediaFilesData
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "create",
      tag
    });

  return res.status(200).json(tag);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;

  const tag = await ShowService(tagId);

  return res.status(200).json(tag);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { kanban } = req.body;

  //console.log(kanban)
  if (req.user.profile !== "admin" && kanban === 1) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { tagId } = req.params;
  const { companyId } = req.user;

  // Buscar tag existente para preservar mediaFiles se não houver novos uploads
  const existingTag = await ShowService(tagId);
  
  // Processar arquivos de mídia
  let mediaFilesData = existingTag.mediaFiles; // Preservar arquivos existentes por padrão
  
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const files = req.files as any[];
    const companyId = req.user?.companyId;
    mediaFilesData = JSON.stringify(files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: `/company${companyId}/lanes/${file.filename}`
    })));
  }

  const tagData = {
    ...req.body,
    mediaFiles: mediaFilesData
  };

  const tag = await UpdateService({ tagData, id: tagId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "update",
      tag
    });

  return res.status(200).json(tag);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tagId } = req.params;
  const { companyId } = req.user;

  await DeleteService(tagId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "delete",
      tagId
    });

  return res.status(200).json({ message: "Tag deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, kanban } = req.query as IndexQuery;
  const { companyId } = req.user;

  const tags = await SimpleListService({ searchParam, kanban, companyId });

  return res.json(tags);
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const tags = await KanbanListService({ companyId });

  return res.json({ lista: tags });
};

export const syncTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body;
  const { companyId } = req.user;

  const tags = await SyncTagService({ ...data, companyId });

  return res.json(tags);
};

export const removeContactTag = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tagId, contactId } = req.params;
  const { companyId } = req.user;

  console.log(tagId, contactId)

  await ContactTag.destroy({
    where: {
      tagId: parseInt(tagId),
      contactId: parseInt(contactId)
    }
  });

  const tag = await ShowService(tagId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company${companyId}-tag`, {
      action: "update",
      tag
    });

  return res.status(200).json({ message: "Tag deleted" });
};