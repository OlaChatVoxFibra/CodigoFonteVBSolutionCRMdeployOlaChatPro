/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getWbot } from "../libs/wbot";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "../libs/cache";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "../libs/socket";

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;

  // console.log("STARTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  if (whatsapp.channel === "telegram" || whatsapp.channel === "telegram_oficial") {
    return res.status(400).json({
      error:
        "Esta conexão é Telegram. Use o botão Login / Webhook na tela de conexões, não o fluxo de QR do WhatsApp."
    });
  }

  if (whatsapp.channel !== "whatsapp" && whatsapp.channel !== "whatsapp_oficial") {
    return res.status(400).json({
      error: "Tipo de conexão sem sessão WhatsApp (QR Code)."
    });
  }

  await StartWhatsAppSession(whatsapp, companyId);

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  await whatsapp.update({ session: "" });

  if (whatsapp.channel === "whatsapp") {
    await StartWhatsAppSession(whatsapp, whatsapp.companyId);
  }

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;
  const io = getIO();
  console.log("DISCONNECTING SESSION", whatsappId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);

    const wbot = await getWbot(whatsapp.id);

    wbot.logout();
    wbot.ws.close();
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
