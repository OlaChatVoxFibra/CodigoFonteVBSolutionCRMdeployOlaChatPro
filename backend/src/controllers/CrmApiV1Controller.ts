/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import ListActivitiesService from "../services/ActivityServices/ListService";
import CreateActivityService from "../services/ActivityServices/CreateService";
import CreateLeadSaleService from "../services/LeadSalesServices/CreateService";
import ListLeadSalesService from "../services/LeadSalesServices/ListService";
import ListConvertedLeadsService from "../services/ConvertedLeadServices/ListService";
import DashboardDataService from "../services/ReportService/DashbardDataService";
import Company from "../models/Company";
import User from "../models/User";
import Project from "../models/Project";
import Activity from "../models/Activity";
import Ticket from "../models/Ticket";
import LeadPipeline from "../models/LeadPipeline";
import LeadPipelineStage from "../models/LeadPipelineStage";
import Contact from "../models/Contact";
import { Op } from "sequelize";
import {
  executeAiBrainCrmTool,
  CRM_TOOLS
} from "../services/AiBrainServices/AiBrainCrmTools";
import AppError from "../errors/AppError";

function getApiContext(req: Request) {
  const ctx = req.apiCredential;
  if (!ctx) {
    throw new AppError("ERR_API_KEY_REQUIRED", 401);
  }
  return ctx;
}

export const health = async (_req: Request, res: Response): Promise<Response> => {
  return res.json({
    ok: true,
    service: "VBSolution CRM API",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
};

export const me = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = getApiContext(req);

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name", "email", "phone", "dueDate", "status"]
  });

  const usersCount = await User.count({ where: { companyId } });
  const contactsCount = await Contact.count({ where: { companyId } });

  return res.json({
    company,
    stats: { usersCount, contactsCount }
  });
};

export const listContacts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const { searchParam = "", pageNumber = "1" } = req.query;

  const data = await ListContactsService({
    searchParam: String(searchParam || ""),
    pageNumber: String(pageNumber || "1"),
    companyId
  });

  return res.json(data);
};

export const createContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const { name, number, email } = req.body;

  const contact = await CreateContactService({
    name,
    number,
    email: email || "",
    companyId
  });

  return res.status(201).json(contact);
};

export const showContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const contact = await ShowContactService(Number(req.params.id), companyId);
  return res.json(contact);
};

export const updateContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const contact = await UpdateContactService({
    contactId: String(req.params.id),
    contactData: req.body,
    companyId
  });
  return res.json(contact);
};

export const listActivities = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const { searchParam = "", pageNumber = "1" } = req.query;

  const data = await ListActivitiesService({
    searchParam: String(searchParam || ""),
    pageNumber: String(pageNumber || "1"),
    companyId
  });

  return res.json(data);
};

export const createActivity = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getApiContext(req);
  const { title, description, type, status, date, owner } = req.body;

  const activity = await CreateActivityService({
    title,
    description: description || "",
    type: type || "task",
    status: status || "pending",
    date: new Date(date || Date.now()),
    owner: owner || "",
    companyId,
    userId
  });

  return res.status(201).json(activity);
};

export const listLeadsSales = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const { searchParam = "", pageNumber = "1", status } = req.query;

  const data = await ListLeadSalesService({
    searchParam: String(searchParam || ""),
    pageNumber: String(pageNumber || "1"),
    companyId,
    status: status ? String(status) : undefined
  });

  return res.json(data);
};

export const createLeadSale = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getApiContext(req);

  const lead = await CreateLeadSaleService({
    ...req.body,
    companyId,
    userId
  });

  return res.status(201).json(lead);
};

export const listConvertedLeads = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const { searchParam = "", pageNumber = "1" } = req.query;

  const data = await ListConvertedLeadsService({
    searchParam: String(searchParam || ""),
    pageNumber: String(pageNumber || "1"),
    companyId
  });

  return res.json(data);
};

export const listProjects = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const pageNumber = Math.max(Number(req.query.pageNumber) || 1, 1);
  const limit = 20;
  const offset = limit * (pageNumber - 1);

  const { count, rows } = await Project.findAndCountAll({
    where: { companyId },
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: Activity, as: "activities" },
      { model: User, as: "user", attributes: ["id", "name", "email"] }
    ]
  });

  return res.json({
    projects: rows,
    count,
    hasMore: count > offset + rows.length
  });
};

export const listTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const status = req.query.status ? String(req.query.status) : undefined;

  const where: Record<string, unknown> = { companyId };
  if (status) where.status = status;

  const tickets = await Ticket.findAll({
    where,
    limit,
    order: [["updatedAt", "DESC"]],
    attributes: [
      "id",
      "status",
      "uuid",
      "contactId",
      "userId",
      "queueId",
      "whatsappId",
      "createdAt",
      "updatedAt"
    ]
  });

  return res.json({ tickets, count: tickets.length });
};

export const listPipelines = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);

  const pipelines = await LeadPipeline.findAll({
    where: { companyId },
    include: [{ model: LeadPipelineStage, as: "stages" }],
    order: [["id", "ASC"]]
  });

  return res.json({ pipelines });
};

export const dashboard = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getApiContext(req);
  const days = Number(req.query.days) || 30;

  const data = await DashboardDataService(companyId, { days });

  return res.json(data);
};

export const listUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = getApiContext(req);
  const search = String(req.query.search || "").trim();
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const where: any = { companyId };
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } }
    ];
  }

  const users = await User.findAll({
    where,
    limit,
    attributes: ["id", "name", "email", "profile", "online"],
    order: [["name", "ASC"]]
  });

  return res.json({ users });
};

export const listTools = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const tools = CRM_TOOLS.map(t => {
    const fn = t.type === "function" ? t.function : null;
    return {
      name: fn?.name,
      description: fn?.description,
      parameters: fn?.parameters
    };
  }).filter(t => t.name);

  return res.json({ tools });
};

export const executeTool = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, userId } = getApiContext(req);
  const toolName = String(req.params.toolName || "").trim();
  const args = req.body && typeof req.body === "object" ? req.body : {};

  if (!toolName) {
    throw new AppError("ERR_TOOL_NAME_REQUIRED", 400);
  }

  const result = await executeAiBrainCrmTool(
    toolName,
    args,
    companyId,
    userId
  );

  let parsed: unknown = result;
  try {
    parsed = JSON.parse(result);
  } catch {
    // mantém string
  }

  return res.json({ tool: toolName, result: parsed });
};
