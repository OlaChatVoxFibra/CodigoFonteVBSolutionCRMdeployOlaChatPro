/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import ListService from "../services/ActivityServices/ListService";
import CreateService from "../services/ActivityServices/CreateService";
import UpdateService from "../services/ActivityServices/UpdateService";
import ShowService from "../services/ActivityServices/ShowService";
import DeleteService from "../services/ActivityServices/DeleteService";

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber, status, dateStart, dateEnd } =
    req.query as IndexQuery;

  const { activities, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    status,
    dateStart,
    dateEnd,
    companyId
  });

  return res.json({ activities, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    title,
    description,
    type,
    status,
    date,
    dateEnd,
    owner,
    userId: bodyUserId,
    responsibleId,
    responsible,
    location,
    address,
    phone,
    link,
    eventColor,
    projectId: bodyProjectId,
    contactId: bodyContactId,
    leadId: bodyLeadId
  } = req.body;
  const assignedUserId =
    bodyUserId != null && bodyUserId !== ""
      ? Number(bodyUserId)
      : responsibleId != null && responsibleId !== ""
      ? Number(responsibleId)
      : responsible != null && responsible !== "" && !Number.isNaN(Number(responsible))
      ? Number(responsible)
      : undefined;
  const projectId = bodyProjectId === "" || bodyProjectId == null ? null : Number(bodyProjectId);

  const data: any = {
    title,
    description,
    type,
    status,
    date,
    dateEnd,
    owner,
    location,
    address,
    phone,
    link,
    eventColor,
    companyId
  };
  if (typeof assignedUserId !== "undefined") {
    data.userId = assignedUserId;
  }
  if (bodyProjectId !== undefined) {
    data.projectId = projectId;
  }
  if (bodyContactId !== undefined) {
    data.contactId = bodyContactId === "" || bodyContactId == null ? null : Number(bodyContactId);
  }
  if (bodyLeadId !== undefined) {
    data.leadId = bodyLeadId === "" || bodyLeadId == null ? null : Number(bodyLeadId);
  }

  const record = await CreateService(data);

  try {
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-activity`, {
      action: "create",
      activity: record
    });
  } catch {
    // Não falhar o POST se o socket ainda não estiver inicializado
  }

  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const {
    title,
    description,
    type,
    status,
    date,
    dateEnd,
    owner,
    userId: bodyUserId,
    responsibleId,
    responsible,
    location,
    address,
    phone,
    link,
    eventColor,
    projectId: bodyProjectId,
    contactId: bodyContactId,
    leadId: bodyLeadId
  } = req.body;
  const updateData: any = {
    id,
    title,
    description,
    type,
    status,
    date,
    dateEnd,
    owner,
    location,
    address,
    phone,
    link,
    eventColor
  };
  if (bodyUserId != null && bodyUserId !== "") {
    updateData.userId = Number(bodyUserId);
  } else if (responsibleId != null && responsibleId !== "") {
    updateData.userId = Number(responsibleId);
  } else if (responsible != null && responsible !== "") {
    updateData.userId = Number(responsible);
  }
  if (bodyProjectId !== undefined) {
    updateData.projectId = bodyProjectId === "" || bodyProjectId == null ? null : Number(bodyProjectId);
  }
  if (bodyContactId !== undefined) {
    updateData.contactId = bodyContactId === "" || bodyContactId == null ? null : Number(bodyContactId);
  }
  if (bodyLeadId !== undefined) {
    updateData.leadId = bodyLeadId === "" || bodyLeadId == null ? null : Number(bodyLeadId);
  }

  const record = await UpdateService(updateData);

  try {
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-activity`, {
      action: "update",
      activity: record
    });
  } catch {
    // Não falhar o PUT se o socket ainda não estiver inicializado
  }

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

  await DeleteService(id, companyId);

  try {
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-activity`, {
      action: "delete",
      id
    });
  } catch {
    // Não falhar o DELETE se o socket ainda não estiver inicializado
  }

  return res.status(200).json({ message: "Activity deleted" });
};
