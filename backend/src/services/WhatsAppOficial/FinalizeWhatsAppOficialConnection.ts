/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import {
  CreateCompanyConnectionOficial
} from "../../libs/whatsAppOficial/whatsAppOficial.service";
import {
  ICreateConnectionWhatsAppOficialCompany,
  ICreateConnectionWhatsAppOficialWhatsApp
} from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import { registerWhatsAppCloudPhone } from "./registerWhatsAppCloudPhone";
import { subscribeWabaWebhooks } from "./subscribeWabaWebhooks";

const isExternalApiConfigured = (): boolean => {
  const url = (process.env.URL_API_OFICIAL || "").trim().replace(/\/$/, "");
  if (!url || url.startsWith("#")) return false;
  if (["https://url.com", "http://url.com"].includes(url)) return false;
  const token = (process.env.TOKEN_API_OFICIAL || "").replace(/"/g, "").trim();
  if (!token || token === "your_token") return false;
  return true;
};

const resolveBackendBaseUrl = (): string => {
  const publicUrl = (process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_PUBLIC_URL || "").trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  const raw = (process.env.BACKEND_URL || "").trim();
  const port = process.env.PORT || process.env.PROXY_PORT || "3000";
  if (!raw) {
    return `http://localhost:${port}`;
  }

  const cleaned = raw.replace(/\/$/, "");

  // HTTPS público (Railway, Vercel, etc.) usa porta 443 — nunca acrescentar PORT interno
  if (/^https:\/\//i.test(cleaned)) {
    return cleaned;
  }

  if (/^https?:\/\/[^/:]+:\d+/i.test(cleaned)) {
    return cleaned;
  }
  if (/^http:\/\/[^/:]+$/i.test(cleaned)) {
    return `${cleaned}:${port}`;
  }
  return cleaned;
};

export const finalizeWhatsAppOficialConnection = async (
  whatsapp: Whatsapp
): Promise<Whatsapp> => {
  if (whatsapp.channel !== "whatsapp_oficial") {
    return whatsapp;
  }

  try {
    if (isExternalApiConfigured()) {
      const companyData: ICreateConnectionWhatsAppOficialCompany = {
        companyId: String(whatsapp.companyId),
        companyName: whatsapp.company?.name || `Company ${whatsapp.companyId}`
      };
      const whatsappOficial: ICreateConnectionWhatsAppOficialWhatsApp = {
        token_mult100: whatsapp.token,
        phone_number_id: whatsapp.phone_number_id,
        waba_id: whatsapp.waba_id,
        send_token: whatsapp.send_token,
        business_id: whatsapp.business_id,
        phone_number: whatsapp.phone_number,
        idEmpresaMult100: whatsapp.companyId
      };

      const { webhookLink, connectionId } = await CreateCompanyConnectionOficial({
        email: whatsapp.company?.email,
        company: companyData,
        whatsApp: whatsappOficial
      });

      if (!webhookLink) {
        throw new Error("API oficial não retornou URL de webhook");
      }

      whatsapp.waba_webhook = webhookLink;
      whatsapp.waba_webhook_id = connectionId;
    } else {
      const backendUrl = resolveBackendBaseUrl();
      const candidateWebhook = `${backendUrl.replace(/\/$/, "")}/v1/webhook/waba`;
      // Não sobrescrever com localhost ao salvar do dev contra banco de produção
      if (isPublicHttpUrl(backendUrl)) {
        whatsapp.waba_webhook = candidateWebhook;
      } else if (!whatsapp.waba_webhook || /localhost|127\.0\.0\.1/i.test(whatsapp.waba_webhook)) {
        logger.warn(
          `[WABA] BACKEND_URL é localhost — waba_webhook não atualizado na conexão ${whatsapp.id}. ` +
            `Configure PUBLIC_BACKEND_URL no Railway ou use Reparar em produção.`
        );
      }
      whatsapp.waba_webhook_id = whatsapp.id;
    }

    whatsapp.status = "CONNECTED";
    await whatsapp.save();

    if (!isExternalApiConfigured()) {
      const sub = await subscribeWabaWebhooks(whatsapp);
      if (!sub.success) {
        logger.warn(
          `[WABA] Conexão ${whatsapp.id}: falha ao inscrever webhooks na WABA: ${sub.error}. ` +
            `Mensagens do cliente NÃO chegam até POST /{waba_id}/subscribed_apps funcionar.`
        );
      }

      const reg = await registerWhatsAppCloudPhone(whatsapp);
      if (!reg.success) {
        logger.warn(
          `[WABA] Conexão ${whatsapp.id} salva, mas registro Cloud API falhou: ${reg.error}. ` +
            `Envio de mensagens retornará erro 133010 até registrar (use Reparar conexão ou META_WABA_REGISTER_PIN).`
        );
      }
    }

    const webhookUrl = whatsapp.waba_webhook || "";
    if (/localhost|127\.0\.0\.1/i.test(webhookUrl)) {
      logger.warn(
        `[WABA] Webhook usa localhost (${webhookUrl}). A Meta não consegue entregar mensagens — configure PUBLIC_BACKEND_URL (ngrok/Railway) e cole a URL no painel Meta.`
      );
    }

    logger.info(
      `[WABA] Conexão ${whatsapp.id} (${whatsapp.name}) finalizada — status CONNECTED`
    );
  } catch (error: any) {
    logger.error(
      `[WABA] Falha ao finalizar conexão ${whatsapp.id}: ${error?.message || error}`
    );
    whatsapp.status = "DISCONNECTED";
    await whatsapp.save();
    throw error;
  }

  return whatsapp;
};

export const repairStuckWhatsAppOficialConnections = async (): Promise<void> => {
  const stuck = await Whatsapp.findAll({
    where: {
      channel: "whatsapp_oficial",
      status: "OPENING"
    }
  });

  if (!stuck.length) return;

  logger.info(
    `[WABA] Reparando ${stuck.length} conexão(ões) oficial(is) presa(s) em OPENING`
  );

  for (const whatsapp of stuck) {
    try {
      await whatsapp.reload({
        include: [{ association: "company" }]
      });
      await finalizeWhatsAppOficialConnection(whatsapp);
    } catch (error: any) {
      logger.error(
        `[WABA] Não foi possível reparar conexão ${whatsapp.id}: ${error?.message || error}`
      );
    }
  }
};

const isPublicHttpUrl = (url: string): boolean =>
  /^https:\/\//i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);

/** Atualiza waba_webhook para URL pública (Railway/ngrok). */
export const repairWhatsAppOficialWebhookUrls = async (): Promise<void> => {
  const base = resolveBackendBaseUrl();
  if (!isPublicHttpUrl(base)) return;

  const expected = `${base.replace(/\/$/, "")}/v1/webhook/waba`;
  const connections = await Whatsapp.findAll({
    where: { channel: "whatsapp_oficial", status: "CONNECTED" }
  });

  for (const whatsapp of connections) {
    if (whatsapp.waba_webhook === expected) continue;

    const old = whatsapp.waba_webhook;
    whatsapp.waba_webhook = expected;
    await whatsapp.save();
    logger.info(
      `[WABA] Webhook conexão ${whatsapp.id} atualizado: ${old} → ${expected}`
    );
  }
};

export { isExternalApiConfigured, resolveBackendBaseUrl };
