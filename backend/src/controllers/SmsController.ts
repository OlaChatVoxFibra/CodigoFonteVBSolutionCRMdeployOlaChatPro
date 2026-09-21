/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import User from "../models/User";
import { getIO } from "../libs/socket";
import CreateSmsConnectionService, {
  testSmsConnection
} from "../services/SmsServices/CreateSmsConnectionService";
import { buildSmsWebhookUrl } from "../services/SmsServices/smsCredentials";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";

async function assertCanManageConnections(req: Request): Promise<void> {
  const { profile } = req.user;
  if (profile === "admin") return;
  const user = await User.findByPk(req.user.id);
  if (user?.allowConnections !== "enabled") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;

  const company = await ShowCompanyService(companyId);
  const plan = await ShowPlanService(company.planId);
  if (!plan.useWhatsapp) {
    return res.status(400).json({
      error: "Plano sem permissão para conexões de mensagens."
    });
  }

  const {
    name,
    provider,
    accountSid,
    apiKey,
    authToken,
    apiSecret,
    fromNumber,
    queueIds,
    greetingMessage,
    color,
    id
  } = req.body;

  const key = String(apiKey || accountSid || "").trim();
  const secret = String(apiSecret || authToken || "").trim();

  const whatsapp = await CreateSmsConnectionService({
    name,
    companyId,
    provider: provider === "twilio" ? "twilio" : "vonage",
    accountSid: key,
    authToken: secret,
    fromNumber: String(fromNumber || "").trim(),
    queueIds: queueIds || [],
    greetingMessage,
    color,
    id
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: id ? "update" : "create",
    whatsapp
  });

  const json = whatsapp.toJSON() as Record<string, unknown>;
  delete json.token;

  return res.status(200).json({
    ...json,
    webhookUrl: buildSmsWebhookUrl(companyId, whatsapp.id),
    provider: whatsapp.provider,
    apiKey: whatsapp.facebookUserId,
    accountSid: whatsapp.facebookUserId,
    fromNumber: whatsapp.number
  });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);

  const {
    provider,
    accountSid,
    apiKey,
    authToken,
    apiSecret,
    fromNumber,
    testToNumber
  } = req.body;
  const result = await testSmsConnection({
    provider: provider === "twilio" ? "twilio" : "vonage",
    accountSid: String(apiKey || accountSid || "").trim(),
    authToken: String(apiSecret || authToken || "").trim(),
    fromNumber: String(fromNumber || "").trim(),
    testToNumber: testToNumber ? String(testToNumber).trim() : undefined
  });

  return res.status(200).json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "sms" }
  });

  if (!connection) {
    throw new AppError("Conexão SMS não encontrada.", 404);
  }

  return res.status(200).json({
    id: connection.id,
    name: connection.name,
    status: connection.status,
    channel: connection.channel,
    provider: connection.provider || "vonage",
    fromNumber: connection.number,
    apiKey: connection.facebookUserId,
    accountSid: connection.facebookUserId,
    hasAuthToken: Boolean(connection.token),
    webhookUrl: buildSmsWebhookUrl(companyId, connection.id),
    color: connection.color
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { whatsappId } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id: whatsappId, companyId, channel: "sms" }
  });

  if (!connection) {
    throw new AppError("Conexão SMS não encontrada.", 404);
  }

  await DeleteWhatsAppService(String(whatsappId));

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId
  });

  return res.status(200).json({ message: "Conexão SMS removida." });
};
