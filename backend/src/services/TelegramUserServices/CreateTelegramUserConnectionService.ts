/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import AssociateWhatsappQueue from "../WhatsappService/AssociateWhatsappQueue";
import {
  validateAndNormalizePhone,
  parseApiHash,
  parseApiId
} from "./telegramUserCredentials";

interface Request {
  name: string;
  companyId: number;
  apiId: string | number;
  apiHash: string;
  phoneNumber: string;
  queueIds?: number[];
  greetingMessage?: string;
  color?: string;
  id?: number;
  promptId?: number | null;
  agentDisabled?: boolean;
}

const CreateTelegramUserConnectionService = async ({
  name,
  companyId,
  apiId,
  apiHash,
  phoneNumber,
  queueIds = [],
  greetingMessage = "",
  color = "",
  id,
  promptId,
  agentDisabled
}: Request): Promise<Whatsapp> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    phoneNumber: Yup.string().required().min(8)
  });

  try {
    await schema.validate({ name, phoneNumber });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const parsedApiId = parseApiId(apiId);
  const apiHashTrimmed = String(apiHash || "").trim();
  const parsedApiHash = apiHashTrimmed ? parseApiHash(apiHashTrimmed) : null;
  const phone = validateAndNormalizePhone(phoneNumber);

  if (id) {
    const existing = await Whatsapp.findOne({
      where: { id, companyId, channel: "telegram_oficial" }
    });
    if (!existing) {
      throw new AppError("Conexão Telegram Oficial não encontrada.", 404);
    }

    await existing.update({
      name,
      facebookUserId: String(parsedApiId),
      ...(parsedApiHash ? { token: parsedApiHash } : {}),
      number: phone,
      phone_number: phone,
      greetingMessage: greetingMessage || "",
      color: color || existing.color,
      ...(promptId !== undefined ? { promptId: promptId ?? null } : {}),
      ...(agentDisabled !== undefined ? { agentDisabled } : {})
    });

    await AssociateWhatsappQueue(existing, queueIds);
    return existing.reload();
  }

  if (!parsedApiHash) {
    throw new AppError(
      "api_hash é obrigatório na primeira criação. Obtenha em https://my.telegram.org/apps",
      400
    );
  }

  const { whatsapp } = await CreateWhatsAppService({
    name,
    status: "DISCONNECTED",
    isDefault: false,
    companyId,
    channel: "telegram_oficial",
    provider: "gramjs",
    token: parsedApiHash,
    facebookUserId: String(parsedApiId),
    number: phone,
    phone_number: phone,
    greetingMessage,
    color,
    queueIds,
    allowGroup: true,
    promptId: promptId ?? undefined,
    agentDisabled: agentDisabled ?? false
  });

  return whatsapp;
};

export default CreateTelegramUserConnectionService;
