/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import ListService from "../services/ConvertedLeadServices/ListService";
import CreateService from "../services/ConvertedLeadServices/CreateService";
import UpdateService from "../services/ConvertedLeadServices/UpdateService";
import ShowService from "../services/ConvertedLeadServices/ShowService";
import DeleteService from "../services/ConvertedLeadServices/DeleteService";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string;
  sector?: string;
  responsibleId?: string;
  contactId?: string;
  dateStart?: string;
  dateEnd?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber, sector, responsibleId, contactId, dateStart, dateEnd } =
    req.query as IndexQuery;

  const { leads, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    sector,
    responsibleId,
    contactId,
    dateStart,
    dateEnd,
    companyId
  });

  return res.json({ leads, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description, email, phone, address, city, state, document, website, sector, contactId, responsibleId, date } = req.body;

  const record = await CreateService({
    name,
    description,
    email,
    phone,
    address,
    city,
    state,
    document,
    website,
    sector,
    contactId,
    responsibleId,
    date,
    companyId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-converted-lead`, {
    action: "create",
    lead: record
  });

  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, description, email, phone, address, city, state, document, website, sector, contactId, responsibleId, date } = req.body;

  const record = await UpdateService({
    id,
    name,
    description,
    email,
    phone,
    address,
    city,
    state,
    document,
    website,
    sector,
    contactId,
    responsibleId,
    date
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-converted-lead`, {
    action: "update",
    lead: record
  });

  return res.json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-converted-lead`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Converted lead deleted" });
};

