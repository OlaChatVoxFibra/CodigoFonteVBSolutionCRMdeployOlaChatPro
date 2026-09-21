/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import ListService from "../services/LeadSalesServices/ListService";
import CreateService from "../services/LeadSalesServices/CreateService";
import UpdateService from "../services/LeadSalesServices/UpdateService";
import ShowService from "../services/LeadSalesServices/ShowService";
import DeleteService from "../services/LeadSalesServices/DeleteService";
import DashboardService from "../services/LeadSalesServices/DashboardService";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  pipelineId?: string;
  responsibleId?: string;
  contactId?: string;
  dateStart?: string;
  dateEnd?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber, status, pipelineId, responsibleId, contactId, dateStart, dateEnd } =
    req.query as IndexQuery;

  const { leads, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    status,
    pipelineId,
    responsibleId,
    contactId,
    dateStart,
    dateEnd,
    companyId
  });

  return res.json({ leads, count, hasMore });
};

export const dashboard = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { status, pipelineId, responsibleId, contactId, dateStart, dateEnd } = req.query as IndexQuery;

  const data = await DashboardService({
    status,
    pipelineId,
    responsibleId,
    contactId,
    dateStart,
    dateEnd,
    companyId
  });

  return res.json(data);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    description,
    status,
    value,
    pipelineId,
    contactId,
    responsibleId,
    date,
    dateEnd,
    companyName,
    phone,
    email,
    tags,
    site,
    origin,
    document,
    birthDate,
    address
  } = req.body;

  const record = await CreateService({
    name,
    description,
    status,
    value,
    pipelineId,
    companyName,
    phone,
    email,
    tags,
    site,
    origin,
    document,
    birthDate,
    address,
    contactId,
    responsibleId,
    date,
    dateEnd,
    companyId
  });

  const io = getIO();
  const full = await ShowService(record.id);
  io.of(String(companyId)).emit(`company-${companyId}-leads-sales`, {
    action: "create",
    lead: full
  });

  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const {
    name,
    description,
    status,
    value,
    pipelineId,
    contactId,
    responsibleId,
    date,
    dateEnd,
    companyName,
    phone,
    email,
    tags,
    site,
    origin,
    document,
    birthDate,
    address
  } = req.body;

  const record = await UpdateService({
    id,
    name,
    description,
    status,
    value,
    pipelineId,
    companyName,
    phone,
    email,
    tags,
    site,
    origin,
    document,
    birthDate,
    address,
    contactId,
    responsibleId,
    date,
    dateEnd
  });

  const io = getIO();
  const full = await ShowService(record.id);
  io.of(String(companyId)).emit(`company-${companyId}-leads-sales`, {
    action: "update",
    lead: full
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
  io.of(String(companyId)).emit(`company-${companyId}-leads-sales`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Lead sale deleted" });
};
