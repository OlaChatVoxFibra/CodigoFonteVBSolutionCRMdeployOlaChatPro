/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import logger from "../utils/logger";
import { sendColdOutreach } from "../services/AgentProactiveServices/ColdOutreachService";
import { resolveContactIdsFromList } from "../services/AgentProactiveServices/coldOutreachResolveContacts";

/**
 * POST /agent-proactive/cold-outreach — mantido para integrações/API.
 * A tela de Proatividade não expõe mais prospecção fria; salvar pela UI desativa hot/reeng/cold no payload.
 */

export const postColdOutreach = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile } = req.user;
  if (profile === "user") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const body = req.body || {};
  const rawIds = body.contactIds;
  const contactListId = body.contactListId != null ? Number(body.contactListId) : null;
  const blendMode = String(body.blendMode || body.coldOutreachBlendMode || "merge");

  const idList: number[] = [];
  if (Array.isArray(rawIds)) {
    for (const x of rawIds) {
      const n = Number(x);
      if (Number.isFinite(n) && n > 0) idList.push(n);
    }
  }

  let fromList: number[] = [];
  if (contactListId && contactListId > 0) {
    fromList = await resolveContactIdsFromList(companyId, contactListId);
  }

  let unique: number[];
  if (blendMode === "list_only") {
    unique = [...new Set(fromList)];
  } else if (blendMode === "ids_only") {
    unique = [...new Set(idList)];
  } else {
    unique = [...new Set([...idList, ...fromList])];
  }
  if (unique.length === 0) {
    return res.status(400).json({ error: "Nenhum contato para enviar" });
  }

  void sendColdOutreach(
    companyId,
    unique.map(id => ({ id }))
  ).catch(err => logger.error("[COLD OUTREACH API] Erro em background:", err));

  return res.status(202).json({
    accepted: unique.length,
    message: "Processamento iniciado em background"
  });
};

export const postUploadProactiveMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile } = req.user;
  if (profile === "user") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const file = req.file as Express.Multer.File | undefined;
  if (!file?.filename) {
    return res.status(400).json({ error: "Envie um arquivo no campo file" });
  }

  const webPath = `/company${companyId}/agent-proactive/${file.filename}`;
  return res.status(200).json({
    path: webPath,
    filename: file.originalname || file.filename
  });
};
