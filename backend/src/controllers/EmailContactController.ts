/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import EmailContact from "../models/EmailContact";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { pageNumber, searchParam } = req.query as any;
  const page = parseInt(pageNumber || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const where: any = { companyId };
  if (searchParam) {
    where[Op.or as any] = [
      { name: { [Op.iLike]: `%${searchParam}%` } },
      { email: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  const { rows, count } = await EmailContact.findAndCountAll({
    where,
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  const hasMore = count > offset + rows.length;
  return res.json({ contacts: rows, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, email, phone, tags } = req.body;
  if (!email) throw new AppError("INVALID_CONTACT", 400);

  const exists = await EmailContact.findOne({ where: { companyId, email } });
  if (exists) throw new AppError("CONTACT_ALREADY_EXISTS", 409);

  const contact = await EmailContact.create({ companyId, name, email, phone, tags } as any);
  return res.status(201).json(contact);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const contact = await EmailContact.findOne({ where: { id, companyId } });
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404);
  const { name, email, phone, tags, isUnsubscribed } = req.body;
  if (email && email !== contact.email) {
    const exists = await EmailContact.findOne({ where: { companyId, email } });
    if (exists) throw new AppError("CONTACT_EMAIL_IN_USE", 409);
  }
  await contact.update({ name, email, phone, tags, isUnsubscribed });
  return res.json(contact);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const contact = await EmailContact.findOne({ where: { id, companyId } });
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404);
  await contact.destroy();
  return res.status(204).send();
};

