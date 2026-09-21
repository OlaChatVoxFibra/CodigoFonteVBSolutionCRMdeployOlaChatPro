/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { getIO } from "../../libs/socket";
import logger from "../../utils/logger";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import UpdateWhatsAppService from "../WhatsappService/UpdateWhatsAppService";
import { exchangeEmbeddedSignupCode } from "./exchangeEmbeddedSignupCode";
import { exchangeMetaTokenToLongLived } from "./exchangeMetaTokenToLongLived";
import { finalizeWhatsAppOficialConnection } from "./FinalizeWhatsAppOficialConnection";
import { sanitizeMetaToken, validateMetaAccessToken } from "./metaWhatsAppAuth";
import { syncCoexistenceAppData } from "./syncCoexistenceAppData";
import { getCompanyMetaEmbeddedConfig } from "./companyMetaEmbeddedConfig";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { resolveUseWhatsappOfficial } from "../../helpers/companyPlanFeatures";

export interface CompleteEmbeddedSignupParams {
  companyId: number;
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string;
  name?: string;
  coexistence?: boolean;
  whatsappId?: number;
  /** Credenciais recém-salvas na mesma sessão (evita race com Settings). */
  inlineAppId?: string;
  inlineAppSecret?: string;
}

const normalizePhoneDigits = (raw: string): string =>
  String(raw || "").replace(/\D/g, "");

const fetchPhoneMetaDetails = async (
  phoneNumberId: string,
  accessToken: string
): Promise<{
  displayPhoneNumber?: string;
  verifiedName?: string;
  status?: string;
  platformType?: string;
  isOnBizApp?: boolean;
}> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          fields:
            "display_phone_number,verified_name,status,platform_type,is_on_biz_app"
        },
        timeout: 15000
      }
    );
    return {
      displayPhoneNumber: data?.display_phone_number,
      verifiedName: data?.verified_name,
      status: data?.status,
      platformType: data?.platform_type,
      isOnBizApp: data?.is_on_biz_app
    };
  } catch (error: any) {
    logger.warn(
      `[WABA Embedded Signup] Não foi possível ler phone ${phoneNumberId}: ${
        error?.response?.data?.error?.message || error?.message
      }`
    );
    return {};
  }
};

export const completeWhatsAppEmbeddedSignup = async (
  params: CompleteEmbeddedSignupParams
): Promise<{
  whatsapp: Whatsapp;
  created: boolean;
  coexistenceSync?: { contactsSync?: boolean; historySync?: boolean };
  phoneMeta?: Awaited<ReturnType<typeof fetchPhoneMetaDetails>>;
}> => {
  const wabaId = String(params.wabaId || "").trim();
  const phoneNumberId = String(params.phoneNumberId || "").trim();

  if (!wabaId || !phoneNumberId) {
    throw new AppError(
      "waba_id e phone_number_id são obrigatórios após Embedded Signup.",
      400
    );
  }

  const metaConfig = await getCompanyMetaEmbeddedConfig(params.companyId);
  const exchangeAppId = (
    params.inlineAppId ||
    metaConfig.appId ||
    ""
  ).trim();
  const exchangeAppSecret = (
    params.inlineAppSecret ||
    metaConfig.appSecret ||
    ""
  ).trim();

  if (!exchangeAppSecret) {
    throw new AppError(
      "App Secret Meta não configurado para esta organização.",
      400
    );
  }

  if (!exchangeAppId) {
    throw new AppError(
      "App ID Meta não configurado para esta organização.",
      400
    );
  }

  const company = await Company.findByPk(params.companyId, {
    include: [{ model: Plan, as: "plan" }]
  });
  if (!company?.plan) {
    throw new AppError("Empresa ou plano não encontrado.", 404);
  }

  if (
    !resolveUseWhatsappOfficial(company) &&
    company.plan.useWhatsapp === false
  ) {
    throw new AppError(
      "Seu plano não inclui WhatsApp API Oficial. Entre em contato com o suporte.",
      403
    );
  }

  const { accessToken, expiresIn } = await exchangeEmbeddedSignupCode(params.code, {
    clientId: exchangeAppId,
    clientSecret: exchangeAppSecret
  });

  // Token do code exchange costuma ser curto (~1–2h). Troca para long-lived (~60d).
  let token = sanitizeMetaToken(accessToken);
  const longLived = await exchangeMetaTokenToLongLived(token, {
    clientId: exchangeAppId,
    clientSecret: exchangeAppSecret
  });
  if (longLived?.accessToken) {
    token = sanitizeMetaToken(longLived.accessToken);
    logger.info(
      `[WABA Embedded Signup] Token long-lived obtido (expires_in=${
        longLived.expiresIn ?? expiresIn ?? "?"
      })`
    );
  } else {
    logger.warn(
      "[WABA Embedded Signup] Não foi possível prolongar o token; usando o retornado no code exchange."
    );
  }

  const tokenValidation = await validateMetaAccessToken(token, phoneNumberId);
  if (!tokenValidation.valid) {
    throw new AppError(
      tokenValidation.error || "Token retornado pela Meta é inválido.",
      400
    );
  }

  const phoneMeta = await fetchPhoneMetaDetails(phoneNumberId, token);
  const phoneNumber = normalizePhoneDigits(
    phoneMeta.displayPhoneNumber || ""
  );
  const connectionName =
    String(params.name || "").trim() ||
    phoneMeta.verifiedName ||
    `WhatsApp ${phoneMeta.displayPhoneNumber || phoneNumberId}`;

  let whatsapp: Whatsapp | null = null;
  let created = false;

  if (params.whatsappId) {
    whatsapp = await Whatsapp.findOne({
      where: {
        id: params.whatsappId,
        companyId: params.companyId,
        channel: "whatsapp_oficial"
      }
    });
    if (!whatsapp) {
      throw new AppError("Conexão não encontrada para atualização.", 404);
    }

    const updated = await UpdateWhatsAppService({
      whatsappId: String(whatsapp.id),
      companyId: params.companyId,
      whatsappData: {
        name: connectionName,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        business_id: params.businessId || whatsapp.business_id,
        phone_number: phoneNumber || whatsapp.phone_number,
        send_token: token,
        status: "OPENING"
      }
    });
    whatsapp = updated.whatsapp;
  } else {
    const existingByPhone = await Whatsapp.findOne({
      where: {
        companyId: params.companyId,
        channel: "whatsapp_oficial",
        phone_number_id: phoneNumberId
      }
    });

    if (existingByPhone) {
      const updated = await UpdateWhatsAppService({
        whatsappId: String(existingByPhone.id),
        companyId: params.companyId,
        whatsappData: {
          name: connectionName,
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          business_id: params.businessId || existingByPhone.business_id,
          phone_number: phoneNumber || existingByPhone.phone_number,
          send_token: token,
          status: "OPENING"
        }
      });
      whatsapp = updated.whatsapp;
    } else {
      const result = await CreateWhatsAppService({
        name: connectionName,
        companyId: params.companyId,
        channel: "whatsapp_oficial",
        status: "OPENING",
        isDefault: false,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        business_id: params.businessId || "",
        phone_number: phoneNumber,
        send_token: token,
        token: `oficial-${Date.now()}`,
        agentDisabled: true
      });
      whatsapp = result.whatsapp;
      created = true;
    }
  }

  whatsapp = await finalizeWhatsAppOficialConnection(whatsapp);
  whatsapp = await ShowWhatsAppService(whatsapp.id, params.companyId);

  let coexistenceSync:
    | { contactsSync?: boolean; historySync?: boolean }
    | undefined;

  const shouldSyncCoexistence =
    params.coexistence !== false &&
    (params.coexistence === true ||
      phoneMeta.isOnBizApp === true ||
      phoneMeta.platformType === "ON_PREMISE" ||
      phoneMeta.platformType === "CLOUD_API");

  if (shouldSyncCoexistence) {
    coexistenceSync = await syncCoexistenceAppData(whatsapp, token);
  }

  const io = getIO();
  io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  logger.info(
    `[WABA Embedded Signup] Conexão ${whatsapp.id} ${
      created ? "criada" : "atualizada"
    } — WABA ${wabaId} phone ${phoneNumberId}`
  );

  return { whatsapp, created, coexistenceSync, phoneMeta };
};
