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
import CreateTelegramConnectionService, {
  testTelegramConnection
} from "../services/TelegramServices/CreateTelegramConnectionService";
import {
  buildTelegramWebhookUrl,
  callTelegramApi
} from "../services/TelegramServices/telegramApi";
import {
  tryConfigureTelegramWebhook,
  removeTelegramWebhook
} from "../services/TelegramServices/configureTelegramWebhook";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import { companySocketNamespace } from "../services/TelegramServices/emitTelegramTicketSocket";
import { stopTelegramPolling } from "../services/TelegramServices/telegramPollingService";

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
    botToken,
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

  const saveResult = await CreateTelegramConnectionService({
    name,
    companyId,
    botToken: String(botToken || "").trim(),
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

  const { whatsapp, webhookConfigured, webhookError } = saveResult;

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: id ? "update" : "create",
    whatsapp
  });

  const json = whatsapp.toJSON() as Record<string, unknown>;
  delete json.token;

  return res.status(200).json({
    ...json,
    webhookUrl: buildTelegramWebhookUrl(companyId, whatsapp.id),
    botUsername: whatsapp.number,
    fromNumber: whatsapp.number,
    webhookConfigured,
    webhookError: webhookError || undefined,
    promptId: whatsapp.promptId ?? null,
    agentDisabled: whatsapp.agentDisabled ?? false
  });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);

  const { botToken, testChatId } = req.body;
  const result = await testTelegramConnection({
    botToken: String(botToken || "").trim(),
    testChatId: testChatId ? String(testChatId).trim() : undefined
  });

  return res.status(200).json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram" },
    include: ["queues", "prompt"]
  });

  if (!connection) {
    throw new AppError("Conexão Telegram não encontrada.", 404);
  }

  let webhookActive = false;
  try {
    if (connection.token) {
      const info = await callTelegramApi<{ url?: string }>(
        connection.token,
        "getWebhookInfo",
        {}
      );
      webhookActive = Boolean(info?.url);
    }
  } catch {
    webhookActive = false;
  }

  return res.status(200).json({
    id: connection.id,
    name: connection.name,
    status: connection.status,
    channel: connection.channel,
    botUsername: connection.number,
    botId: connection.facebookUserId,
    hasBotToken: Boolean(connection.token),
    webhookUrl: buildTelegramWebhookUrl(companyId, connection.id),
    webhookActive,
    color: connection.color,
    greetingMessage: connection.greetingMessage,
    promptId: connection.promptId ?? null,
    agentDisabled: connection.agentDisabled ?? false,
    queueIds: (connection.queues || []).map((q: { id: number }) => q.id)
  });
};

export const configureWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram" }
  });

  if (!connection) {
    throw new AppError("Conexão Telegram não encontrada.", 404);
  }

  if (!connection.token?.trim()) {
    throw new AppError("Conexão sem Bot Token. Edite e informe o token.", 400);
  }

  const {
    connection: updated,
    configured,
    deliveryMode,
    syncedUpdates,
    botLabel,
    error
  } = await tryConfigureTelegramWebhook(connection);

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: updated
  });

  const mode =
    deliveryMode ||
    (configured ? "webhook" : undefined);

  return res.status(200).json({
    ok: true,
    webhookConfigured: configured,
    deliveryMode: mode,
    syncedUpdates: syncedUpdates ?? 0,
    botLabel: botLabel || updated.number,
    webhookError: error,
    webhookUrl: buildTelegramWebhookUrl(companyId, updated.id),
    status: updated.status
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { whatsappId } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id: whatsappId, companyId, channel: "telegram" }
  });

  if (!connection) {
    throw new AppError("Conexão Telegram não encontrada.", 404);
  }

  stopTelegramPolling(connection.id);
  await removeTelegramWebhook(connection);
  await DeleteWhatsAppService(String(whatsappId));

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId
  });

  return res.status(200).json({ message: "Conexão Telegram removida." });
};
