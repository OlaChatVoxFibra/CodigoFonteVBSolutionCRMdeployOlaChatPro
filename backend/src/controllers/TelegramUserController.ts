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
import CreateTelegramUserConnectionService from "../services/TelegramUserServices/CreateTelegramUserConnectionService";
import {
  confirmTelegramUserLogin,
  disconnectTelegramUserClient,
  sendTelegramUserLoginCode,
  startTelegramUserClient
} from "../services/TelegramUserServices/telegramUserClientManager";
import { companySocketNamespace } from "../services/TelegramServices/emitTelegramTicketSocket";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import { normalizeTelegramOficialStatus } from "../services/TelegramUserServices/normalizeTelegramOficialStatus";
import { parsePairingMeta } from "../services/TelegramUserServices/telegramUserPairing";

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
    apiId,
    apiHash,
    phoneNumber,
    queueIds,
    greetingMessage,
    color,
    id,
    promptId,
    agentDisabled
  } = req.body;

  const parsedPromptId =
    promptId === "" || promptId === null || promptId === undefined
      ? null
      : Number(promptId);

  const whatsapp = await CreateTelegramUserConnectionService({
    name,
    companyId,
    apiId,
    apiHash,
    phoneNumber,
    queueIds: queueIds || [],
    greetingMessage,
    color,
    id,
    promptId: Number.isFinite(parsedPromptId as number) ? parsedPromptId : null,
    agentDisabled:
      agentDisabled === true || agentDisabled === "true" || agentDisabled === 1
  });

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: id ? "update" : "create",
    whatsapp
  });

  const json = whatsapp.toJSON() as Record<string, unknown>;
  delete json.token;
  delete json.session;

  return res.status(200).json({
    ...json,
    apiId: whatsapp.facebookUserId,
    phoneNumber: whatsapp.phone_number || whatsapp.number
  });
};

export const sendCode = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram_oficial" }
  });
  if (!connection) {
    throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
  }

  const result = await sendTelegramUserLoginCode(connection);
  await normalizeTelegramOficialStatus(connection);
  const reloaded = await connection.reload();

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: reloaded
  });

  return res.status(200).json({
    ok: true,
    ...result,
    status: reloaded.status,
    pairingPending: Boolean(parsePairingMeta(reloaded.tokenMeta))
  });
};

export const signIn = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { id } = req.params;
  const { code, password } = req.body;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram_oficial" }
  });
  if (!connection) {
    throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
  }

  const updated = await confirmTelegramUserLogin(
    connection,
    String(code || ""),
    password ? String(password) : undefined
  );

  const json = updated.toJSON() as Record<string, unknown>;
  delete json.token;
  delete json.session;

  return res.status(200).json({
    ok: true,
    ...json,
    hasSession: true,
    hasMtprotoSession: true,
    apiId: updated.facebookUserId,
    phoneNumber: updated.phone_number || updated.number,
    telegramLabel: String(updated.number || "").startsWith("@")
      ? updated.number
      : null
  });
};

export const reconnect = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram_oficial" }
  });
  if (!connection) {
    throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
  }

  await startTelegramUserClient(connection);
  const updated = await connection.reload();

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "update",
    whatsapp: updated
  });

  return res.status(200).json({
    ok: true,
    status: updated.status,
    number: updated.number
  });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id, companyId, channel: "telegram_oficial" },
    include: ["queues", "prompt"]
  });

  if (!connection) {
    throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
  }

  await normalizeTelegramOficialStatus(connection);
  const reloaded = await connection.reload();
  const pairingPending = Boolean(parsePairingMeta(reloaded.tokenMeta));

  return res.status(200).json({
    id: reloaded.id,
    name: reloaded.name,
    status: reloaded.status,
    channel: reloaded.channel,
    apiId: reloaded.facebookUserId,
    phoneNumber:
      reloaded.phone_number && !String(reloaded.phone_number).startsWith("@")
        ? reloaded.phone_number
        : "",
    telegramLabel: String(reloaded.number || "").startsWith("@")
      ? reloaded.number
      : null,
    hasSession: Boolean(String(reloaded.session || "").trim()),
    pairingPending,
    color: reloaded.color,
    greetingMessage: reloaded.greetingMessage,
    promptId: reloaded.promptId ?? null,
    agentDisabled: reloaded.agentDisabled ?? false,
    queueIds: (reloaded.queues || []).map((q: { id: number }) => q.id)
  });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  await assertCanManageConnections(req);
  const { companyId } = req.user;
  const { whatsappId } = req.params;

  const connection = await Whatsapp.findOne({
    where: { id: whatsappId, companyId, channel: "telegram_oficial" }
  });

  if (!connection) {
    throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
  }

  await disconnectTelegramUserClient(connection.id);
  await DeleteWhatsAppService(String(whatsappId));

  const io = getIO();
  io.of(companySocketNamespace(companyId)).emit(`company-${companyId}-whatsapp`, {
    action: "delete",
    whatsappId
  });

  return res.status(200).json({ message: "Conexão Telegram Oficial removida." });
};
