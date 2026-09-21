/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { getMetaAccessToken } from "./metaWhatsAppAuth";

export interface RegisterPhoneResult {
  success: boolean;
  alreadyRegistered?: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  code?: number;
  phoneStatus?: string;
}

/** PIN de 6 dígitos para registro Cloud API (define 2FA se ainda não existir). */
export const getMetaRegisterPin = (): string => {
  const raw = (process.env.META_WABA_REGISTER_PIN || "123456").replace(/\D/g, "");
  return raw.slice(0, 6).padStart(6, "0");
};

export const getWhatsAppPhoneCloudStatus = async (
  whatsapp: Whatsapp
): Promise<{ status?: string; error?: string }> => {
  const token = getMetaAccessToken(whatsapp);
  if (!token || !whatsapp.phone_number_id) {
    return { error: "Token ou phone_number_id ausente" };
  }

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { fields: "status,display_phone_number,verified_name" },
        timeout: 15000
      }
    );
    return { status: data?.status };
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message;
    return { error: msg };
  }
};

/**
 * Registra o número na WhatsApp Cloud API (obrigatório para enviar mensagens).
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/reference/registration/
 */
export const registerWhatsAppCloudPhone = async (
  whatsapp: Whatsapp,
  pin?: string
): Promise<RegisterPhoneResult> => {
  if (!whatsapp.phone_number_id) {
    return { success: false, error: "phone_number_id não configurado na conexão" };
  }

  const token = getMetaAccessToken(whatsapp);
  if (!token) {
    return { success: false, error: "Token Meta não configurado" };
  }

  const statusBefore = await getWhatsAppPhoneCloudStatus(whatsapp);
  if (statusBefore.status === "CONNECTED") {
    return {
      success: true,
      skipped: true,
      skipReason: "already_connected",
      phoneStatus: statusBefore.status
    };
  }

  const registrationPin = (pin || getMetaRegisterPin())
    .replace(/\D/g, "")
    .slice(0, 6)
    .padStart(6, "0");

  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/register`,
      {
        messaging_product: "whatsapp",
        pin: registrationPin
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    const statusInfo = await getWhatsAppPhoneCloudStatus(whatsapp);

    logger.info(
      `[WABA Register] Número registrado na Cloud API — conexão ${whatsapp.id}, status=${statusInfo.status || "?"}`
    );

    return { success: true, phoneStatus: statusInfo.status };
  } catch (error: any) {
    const metaError = error?.response?.data?.error;
    const code = metaError?.code;
    const msg = metaError?.message || error?.message || "Falha ao registrar número";

    if (
      code === 133015 ||
      /already registered|já registrado/i.test(String(msg))
    ) {
      const statusInfo = await getWhatsAppPhoneCloudStatus(whatsapp);
      return {
        success: true,
        alreadyRegistered: true,
        phoneStatus: statusInfo.status
      };
    }

    const subcode = metaError?.error_subcode;
    let userMessage = msg;

    if (subcode === 2388001) {
      userMessage =
        "Este número ainda está ativo em outra conta WhatsApp (app comum ou outro WABA). " +
        "No celular: Configurações → Conta → Excluir conta (ou desvincule no Meta Business Manager). " +
        "Aguarde até 3 minutos e use Reparar conexão novamente.";
    } else if (code === 133016) {
      const statusInfo = await getWhatsAppPhoneCloudStatus(whatsapp);
      if (statusInfo.status === "CONNECTED") {
        return {
          success: true,
          skipped: true,
          skipReason: "rate_limit_but_connected",
          phoneStatus: statusInfo.status
        };
      }
      userMessage =
        "Limite de tentativas de registro (10 em 72h). Aguarde e tente depois.";
    } else if (/SMB businesses|not available for SMB/i.test(String(msg))) {
      const statusInfo = await getWhatsAppPhoneCloudStatus(whatsapp);
      logger.info(
        `[WABA Register] Conta SMB — /register não disponível, status=${statusInfo.status}`
      );
      if (statusInfo.status === "CONNECTED") {
        return {
          success: true,
          skipped: true,
          skipReason: "smb_no_register_endpoint",
          phoneStatus: statusInfo.status
        };
      }
      userMessage =
        "Conta SMB: registro via API não disponível. Conecte o número no WhatsApp Manager até status Conectado.";
    }

    logger.error(
      `[WABA Register] Falha conexão ${whatsapp.id}: ${msg} (code=${code}, subcode=${subcode})`
    );

    return { success: false, error: userMessage, code };
  }
};

export const describePhoneCloudStatus = (status?: string): string => {
  switch (String(status || "").toUpperCase()) {
    case "CONNECTED":
      return "Pronto para enviar e receber.";
    case "PENDING":
      return "Pendente na Meta — finalize verificação no WhatsApp Manager e registre na Cloud API.";
    case "DISCONNECTED":
      return "Desconectado — reconecte o número no Meta Business.";
    default:
      return status
        ? `Status Meta: ${status}`
        : "Status desconhecido — verifique no WhatsApp Manager.";
  }
};
