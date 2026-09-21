/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import EmailTemplate from "../models/EmailTemplate";
import AppError from "../errors/AppError";
import EmailTemplateAttachment from "../models/EmailTemplateAttachment";
import uploadConfig from "../config/upload";
import mime from "mime-types";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { pageNumber, searchParam } = req.query as any;
  const page = parseInt(pageNumber || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const where: any = { companyId };
  if (searchParam) where.name = { $like: `%${searchParam}%` } as any;

  const { rows, count } = await EmailTemplate.findAndCountAll({
    where,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  const hasMore = count > offset + rows.length;
  return res.json({ templates: rows, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { name, subject, contentHtml, contentText, isActive, description, fontSize } = req.body;
  if (!name || !subject) throw new AppError("INVALID_TEMPLATE", 400);
  const template = await EmailTemplate.create({
    companyId,
    name,
    subject,
    contentHtml,
    contentText,
    description,
    fontSize,
    createdBy: userId,
    isActive: isActive !== undefined ? isActive : true
  } as any);
  return res.status(201).json(template);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  const { name, subject, contentHtml, contentText, isActive, description, fontSize, signatureImagePath } = req.body;
  const payload: any = { name, subject, contentHtml, contentText, isActive, description, fontSize };
  if (typeof signatureImagePath !== "undefined") {
    payload.signatureImagePath = signatureImagePath;
  }
  await template.update(payload);
  return res.json(template);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  await template.destroy();
  return res.status(204).send();
};

export const listAttachments = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  const attachments = await EmailTemplateAttachment.findAll({
    where: { companyId, templateId: id },
    attributes: ["id","companyId","templateId","filename","path","size","mimetype","createdAt","updatedAt"]
  } as any);
  return res.json({ attachments });
};

export const uploadAttachments = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const files = req.files as Express.Multer.File[];
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  if (!files || files.length === 0) throw new AppError("NO_FILES_UPLOADED", 400);
  const maxSize = 50 * 1024 * 1024;
  for (const f of files) {
    if (f.size > maxSize) throw new AppError("FILE_TOO_LARGE", 413);
  }
  const rows = await Promise.all(
    files.map(async f => {
      let data: Buffer | undefined;
      try {
        let p = (f as any).path as string | undefined;
        if (!p && (f as any).destination && (f as any).filename) {
          p = path.join((f as any).destination, (f as any).filename);
        }
        if (p && fs.existsSync(p)) {
          data = fs.readFileSync(p);
        } else if ((f as any).buffer) {
          data = (f as any).buffer as Buffer;
        }
      } catch {
        /* noop */
      }
      return {
        companyId,
        templateId: Number(id),
        filename: f.originalname,
        path: `/public/company${companyId}/emailTemplates/${id}/${f.filename.replace('/', '-')}`,
        size: f.size,
        mimetype: f.mimetype,
        data: data || null
      } as any;
    })
  );
  const created = await EmailTemplateAttachment.bulkCreate(rows);
  return res.status(201).json({ attachments: created });
};

export const uploadSignatureImage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const files = req.files as Express.Multer.File[];
  const file = files?.[0];
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  if (!file) throw new AppError("NO_FILES_UPLOADED", 400);
  if (!file.mimetype.startsWith("image/")) throw new AppError("INVALID_IMAGE", 415);
  if (file.size > 50 * 1024 * 1024) throw new AppError("FILE_TOO_LARGE", 413);
  const relPath = `/public/company${companyId}/emailTemplates/${id}/${file.filename.replace('/', '-')}`;
  let data: Buffer | null = null;
  try {
    let p = (file as any).path as string | undefined;
    if (!p && (file as any).destination && (file as any).filename) {
      p = path.join((file as any).destination, (file as any).filename);
    }
    if (p && fs.existsSync(p)) {
      data = fs.readFileSync(p);
    } else if ((file as any).buffer) {
      data = (file as any).buffer as Buffer;
    }
  } catch {
    data = null;
  }
  await template.update({ signatureImagePath: relPath, signatureImageData: data as any });
  return res.json({ signatureImagePath: relPath });
};

export const removeAttachment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id, attachmentId } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  const att = await EmailTemplateAttachment.findOne({ where: { id: attachmentId, companyId, templateId: id } });
  if (!att) throw new AppError("ATTACHMENT_NOT_FOUND", 404);
  const filePath = att.path?.startsWith("/public/")
    ? path.join(uploadConfig.directory, att.path.replace(/^\/public\/*/, ""))
    : path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(id), att.filename);
  try { fs.unlinkSync(filePath); } catch {}
  await att.destroy();
  return res.status(204).send();
};

export const clearSignatureImage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  const prev = template.signatureImagePath || "";
  if (prev) {
    const filePath = prev.startsWith("/public/")
      ? path.join(uploadConfig.directory, prev.replace(/^\/public\/*/, ""))
      : path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(id));
    try { fs.unlinkSync(filePath); } catch {}
  }
  await template.update({ signatureImagePath: null as any, signatureImageData: null as any });
  return res.json({ signatureImagePath: null });
};

export const viewSignatureImage = async (req: Request, res: Response): Promise<any> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  if (template.signatureImageData) {
    const rel = template.signatureImagePath || "";
    const ctype = (rel && mime.lookup(rel)) || "image/png";
    res.setHeader("Content-Type", String(ctype));
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.end(Buffer.from(template.signatureImageData));
  } else {
    const rel = template.signatureImagePath;
    if (!rel) throw new AppError("NOT_FOUND", 404);
    const filePath = rel.startsWith("/public/")
      ? path.join(uploadConfig.directory, rel.replace(/^\/public\/*/, ""))
      : path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(id), path.basename(rel));
    if (!fs.existsSync(filePath)) {
      throw new AppError("NOT_FOUND", 404);
    }
    const ctype = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", ctype as string);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.sendFile(filePath);
  }
};

// Versão pública (sem auth) para exibir assinatura no Preview quando cookies/autorização não são incluídos por <img>
export const viewSignatureImagePublic = async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params as any;
  const template = await EmailTemplate.findOne({ where: { id } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  if (template.signatureImageData) {
    const rel = template.signatureImagePath || "";
    const ctype = (rel && mime.lookup(rel)) || "image/png";
    res.setHeader("Content-Type", String(ctype));
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.end(Buffer.from(template.signatureImageData));
  } else {
    const rel = template.signatureImagePath;
    if (!rel) throw new AppError("NOT_FOUND", 404);
    const companyId = template.companyId;
    const filePath = rel.startsWith("/public/")
      ? path.join(uploadConfig.directory, rel.replace(/^\/public\/*/, ""))
      : path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(id), path.basename(rel));
    if (!fs.existsSync(filePath)) {
      throw new AppError("NOT_FOUND", 404);
    }
    const ctype = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", ctype as string);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.sendFile(filePath);
  }
};

