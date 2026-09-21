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
import CreateLinkedInConnectionService, {
  testLinkedInConnection
} from "../services/LinkedInServices/CreateLinkedInConnectionService";
import { buildLinkedInWebhookUrl } from "../services/LinkedInServices/linkedinCredentials";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import { companySocketNamespace } from "../services/TelegramServices/emitTelegramTicketSocket";

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
    clientId,
    clientSecret,
    accessToken,
    senderUrn,
    senderLabel,
    queueIds,
    greetingMessage,
    color,
    id,
    webhookSecret,
    promptId,
    agentDisabled
  } = req.body;

  const parsedPromptId =
    promptId === null || promptId === "" || promptId === undefined
      ? null
      : Number(promptId);

  const saveResult = await CreateLinkedInConnectionService({
    name,
    companyId,
    clientId: String(clientId || "").trim(),
    clientSecret: String(clientSecret || "").trim(),
    accessToken: String(accessToken || "").trim(),
    senderUrn: String(senderUrn || "").trim(),
    senderLabel: senderLabel ? String(senderLabel).trim() : undefined,
    queueIds: queueIds || [],
    greetingMessage,
    color,
    id,
    webhookSecret: webhookSecret ? String(webhookSecret).trim() : undefined,
    promptId:
      parsedPromptId !== null && !Number.isNaN(parsedPromptId)
        ? parsedPromptId
        : null,
    agentDisabled:
      agentDisabled === true || agentDisabled === "true" || agentDisabled === 1
  });

  const { whatsapp, webhookUrl } = saveResult;

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: id ? "update" : "create",
    whatsapp
  });

  const json = whatsapp.toJSON() as Record<string, unknown>;
  delete json.token;
  delete json.send_token;
  delete json.facebookUserToken;

  return res.status(200).json({
    ...json,
    webhookUrl,
    fromNumber: whatsapp.number,
    promptId: whatsapp.promptId ?? null,
    agentDisabled: whatsapp.agentDisabled ?? false
  });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);

  const { accessToken, senderUrn, testRecipientUrn } = req.body;
  const result = await testLinkedInConnection({
    accessToken: String(accessToken || "").trim(),
    senderUrn: senderUrn ? String(senderUrn).trim() : undefined,
    testRecipientUrn: testRecipientUrn
      ? String(testRecipientUrn).trim()
      : undefined
  });

  return res.status(200).json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "linkedin" },
    include: ["queues", "prompt"]
  });

  if (!connection) {
    throw new AppError("Conexão LinkedIn não encontrada.", 404);
  }

  const json = connection.toJSON() as Record<string, unknown>;
  delete json.token;
  delete json.send_token;
  delete json.facebookUserToken;

  return res.status(200).json({
    ...json,
    webhookUrl: buildLinkedInWebhookUrl(companyId, connection.id),
    senderUrn: connection.phone_number_id,
    clientId: connection.facebookUserId,
    promptId: connection.promptId ?? null,
    agentDisabled: connection.agentDisabled ?? false
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { whatsappId } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id: whatsappId, companyId, channel: "linkedin" }
  });
  if (!connection) {
    throw new AppError("Conexão LinkedIn não encontrada.", 404);
  }

  await DeleteWhatsAppService(String(whatsappId));

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId
  });

  return res.status(200).json({ message: "Conexão LinkedIn removida." });
};
