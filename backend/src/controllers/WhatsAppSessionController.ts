/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import { resetBaileysAuthState } from "../libs/wbot";
import { getIO } from "../libs/socket";
import logger from "../utils/logger";

const assertWhatsAppWebChannel = (channel: string | null | undefined): string | null => {
  if (channel === "telegram" || channel === "telegram_oficial") {
    return "Esta conexão é Telegram. Use o botão Login / Webhook na tela de conexões, não o fluxo de QR do WhatsApp.";
  }
  if (channel === "whatsapp_oficial") {
    return "WhatsApp Oficial (Cloud API) não usa QR Code. Configure o Embedded Signup / tokens Meta.";
  }
  if (channel && channel !== "whatsapp") {
    return "Tipo de conexão sem sessão WhatsApp (QR Code).";
  }
  return null;
};

/** Limpa auth Baileys e inicia sessão limpa para gerar QR em qualquer conta. */
const hardResetAndStartQrSession = async (
  whatsapp: Awaited<ReturnType<typeof ShowWhatsAppService>>,
  companyId: number
): Promise<void> => {
  await resetBaileysAuthState(whatsapp.id, { logout: true });

  await whatsapp.update({
    session: "",
    qrcode: "",
    status: "OPENING",
    retries: 0,
    number: ""
  });
  await whatsapp.reload();

  const io = getIO();
  const sessionCompanyId = whatsapp.companyId || companyId;
  io.of("/" + String(sessionCompanyId)).emit(
    `company-${sessionCompanyId}-whatsappSession`,
    {
      action: "update",
      session: whatsapp
    }
  );

  await StartWhatsAppSession(whatsapp, sessionCompanyId);
};

const store = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  const channelError = assertWhatsAppWebChannel(whatsapp.channel);
  if (channelError) {
    return res.status(400).json({ error: channelError });
  }

  try {
    await hardResetAndStartQrSession(whatsapp, companyId);
  } catch (err) {
    logger.error({ err, whatsappId }, "Falha ao iniciar sessão WhatsApp (store)");
    return res.status(500).json({ error: "Falha ao iniciar sessão WhatsApp." });
  }

  return res.status(200).json({ message: "Starting session." });
};

const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  const channelError = assertWhatsAppWebChannel(whatsapp.channel);
  if (channelError) {
    return res.status(400).json({ error: channelError });
  }

  try {
    await hardResetAndStartQrSession(whatsapp, whatsapp.companyId || companyId);
  } catch (err) {
    logger.error({ err, whatsappId }, "Falha ao gerar novo QR Code (update)");
    return res.status(500).json({ error: "Falha ao gerar novo QR Code." });
  }

  return res.status(200).json({ message: "Starting session." });
};

const remove = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;
  const io = getIO();
  logger.info(`DISCONNECTING SESSION ${whatsappId}`);
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  if (whatsapp.channel === "whatsapp" || !whatsapp.channel) {
    await resetBaileysAuthState(+whatsappId, { logout: true });

    await whatsapp.update({
      status: "DISCONNECTED",
      qrcode: "",
      session: "",
      retries: 0
    });
    await whatsapp.reload();

    const sessionCompanyId = whatsapp.companyId || companyId;
    io.of("/" + String(sessionCompanyId)).emit(
      `company-${sessionCompanyId}-whatsappSession`,
      {
        action: "update",
        session: whatsapp
      }
    );
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export default { store, remove, update };
