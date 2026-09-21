/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Ajustes de tipagem e dependências para evitar erros de compilação
declare const process: any;
declare module "crypto";
const cryptoMod: any = (() => {
  try {
    // carrega crypto de forma dinâmica, evitando erro de tipagem em ambientes sem @types/node
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("crypto");
  } catch {
    return null;
  }
})();
import Whatsapp from "../models/Whatsapp";
import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
import { handleMessage as handleWhatsAppOficialWebhook } from "./MetaController";
import { verifyMetaWebhookSignature } from "../helpers/verifyMetaWebhookSignature";
import logger from "../utils/logger";

export const index = async (req: any, res: any): Promise<any> => {
  // O Meta chama este endpoint para validar o webhook.
  // Em alguns deployments, o VERIFY_TOKEN no painel pode não ser exatamente
  // o padrão do projeto (ex.: "vbsolution").
  // Para evitar travar a integração, aceitamos alguns tokens legados.
  const verifyTokenFromEnv = process.env.VERIFY_TOKEN;
  const legacyTokens = ["vbsolution", "vbsolution"].filter(Boolean);
  const allowedTokens = [verifyTokenFromEnv, ...legacyTokens].filter(
    (t) => typeof t === "string" && t.length > 0
  );

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && allowedTokens.includes(String(token))) {
      return res.status(200).send(challenge);
    }
  }

  return res.status(403).json({
    message: "Forbidden"
  });
};

export const webHook = async (
  req: any,
  res: any
): Promise<any> => {
  try {
    // Debug forte: confirmar se o endpoint está sendo atingido pelo Meta
    try {
      console.log("[MetaWebhook][ENTRY]", {
        method: req.method,
        path: req.path,
        hasBody: !!req.body,
        bodyObject: req?.body?.object,
        sigHeaderPresent: !!req.headers?.["x-hub-signature-256"],
        rawBodyType: typeof (req as any).rawBody,
        hasAppSecret: !!process.env.FACEBOOK_APP_SECRET
      });
    } catch {
      // ignore
    }

    const sig = verifyMetaWebhookSignature(req);
    if (!sig.ok) {
      logger.error(
        `[MetaWebhook] Assinatura rejeitada (${sig.reason}) path=${req.path} — defina FACEBOOK_APP_SECRET correto no Railway ou META_WEBHOOK_STRICT_SIGNATURE=false.`
      );
      return res.status(403).json({
        message: "Invalid signature",
        hint: "FACEBOOK_APP_SECRET incorreto no servidor"
      });
    }
    if (sig.skipped && sig.reason) {
      const level =
        sig.reason === "signature_mismatch_lenient" ? "warn" : "info";
      const msg = `[MetaWebhook] Assinatura ignorada: ${sig.reason}`;
      if (level === "warn") {
        logger.warn(
          `${msg} — processando mesmo assim. Corrija FACEBOOK_APP_SECRET no Railway.`
        );
      } else {
        logger.info(msg);
      }
    }

    const { body } = req;

    if (body?.object === "whatsapp_business_account") {
      return handleWhatsAppOficialWebhook(req, res);
    }

    // Se a Meta estiver chamando um callback que inclui `:companyId/:connectionId`,
    // usamos a conexão diretamente (evita falha quando o payload usa um ID diferente
    // do `facebookPageUserId` salvo).
    const companyIdFromParams = req?.params?.companyId
      ? Number(req.params.companyId)
      : null;
    const connectionIdFromParams = req?.params?.connectionId
      ? Number(req.params.connectionId)
      : null;
    const connectionFromParams = connectionIdFromParams
      ? await Whatsapp.findByPk(connectionIdFromParams)
      : null;

    // Debug básico para confirmar se o webhook Meta está chegando
    try {
      const obj = body?.object;
      const entryIds = Array.isArray(body?.entry) ? body.entry.map((e: any) => e?.id).slice(0, 5) : [];
      console.log("[MetaWebhook]", { object: obj, entryIds });
    } catch {
      // ignore
    }
    if (body.object === "page" || body.object === "instagram") {
      let channel: string;

      if (body.object === "page") {
        channel = "facebook";
      } else {
        channel = "instagram";
      }

      for (const entry of body.entry || []) {
        const getTokenPage =
          (connectionFromParams && connectionFromParams.channel === channel
            ? connectionFromParams
            : await (Whatsapp as any).findOne({
                where: {
                  facebookPageUserId: entry.id,
                  channel
                }
              }));

        if (Array.isArray(entry.messaging)) {
          // Facebook (page) envia eventos em entry.messaging
          if (!getTokenPage) {
            try {
              console.log("[MetaWebhook][TOKEN_NOT_FOUND]", {
                entryId: entry?.id,
                channel,
                companyIdFromParams,
                connectionIdFromParams
              });
            } catch {
              // ignore
            }
            continue;
          }
          entry.messaging.forEach((data: any) => {
            handleMessage(getTokenPage, data, channel, getTokenPage.companyId);
          });
        }

        // Mensagens em standby (handover / Human Agent — app não é receptor primário)
        if (Array.isArray(entry.standby)) {
          if (!getTokenPage) {
            try {
              console.log("[MetaWebhook][STANDBY_TOKEN_NOT_FOUND]", {
                entryId: entry?.id,
                channel
              });
            } catch {
              // ignore
            }
          } else {
            entry.standby.forEach((data: any) => {
              handleMessage(getTokenPage, data, channel, getTokenPage.companyId);
            });
          }
        }

        // Suporte a Instagram: eventos vêm em entry.changes[].value
        if (channel === "instagram" && Array.isArray(entry.changes)) {
          const findTokenByIds = async (candidateId: string | undefined) => {
            if (!candidateId) return null;

            // 1) Tenta como instagram
            const tokenInstagram = await (Whatsapp as any).findOne({
              where: { facebookPageUserId: candidateId, channel: "instagram" }
            });
            if (tokenInstagram) return tokenInstagram;

            // 2) Fallback: às vezes o id do payload bate com a conexão facebook,
            // mas ainda queremos criar ticket com channel="instagram".
            const tokenFacebook = await (Whatsapp as any).findOne({
              where: { facebookPageUserId: candidateId, channel: "facebook" }
            });
            if (tokenFacebook) return tokenFacebook;

            return null;
          };

          entry.changes.forEach((chg: any) => {
            if (chg?.field !== "messages" || !chg?.value) return;

            const v = chg.value;

            // Alguns payloads vêm como "value" (objeto único) ou como "value.messages" (array).
            const messageItems: any[] = Array.isArray(v?.messages)
              ? v.messages
              : [v];

            messageItems.forEach((item: any) => {
              const senderId = item?.sender?.id || item?.from?.id;
              const recipientId = item?.recipient?.id || item?.to?.id;
              const timestamp = item?.timestamp;
              const messageObj = item?.message || item?.messages || item;

              // Resolve a conexão/token para cada mensagem (fallback por recipientId).
              // Se não existir conexão, ignora o evento.
              (async () => {
                const token =
                  getTokenPage ||
                  (connectionFromParams && connectionFromParams.channel === channel
                    ? connectionFromParams
                    : null) ||
                  (await findTokenByIds(recipientId)) ||
                  (await findTokenByIds(senderId)) ||
                  (await findTokenByIds(entry?.id));

                if (!token) {
                  try {
                    console.log("[InstagramWebhook][TOKEN_NOT_FOUND]", {
                      entryId: entry?.id,
                      senderId,
                      recipientId,
                      companyIdFromParams,
                      connectionIdFromParams
                    });
                  } catch {
                    // ignore
                  }
                  return;
                }

                const normalized = {
                  sender: { id: senderId },
                  recipient: { id: recipientId },
                  timestamp,
                  message: messageObj
                };

                // Log leve para debug de payload Instagram
                try {
                  const textPreview =
                    typeof messageObj?.text === "string" ? messageObj.text.slice(0, 60) : null;
                  console.log("[InstagramWebhook]", {
                    entryId: entry?.id,
                    channel,
                    senderId,
                    recipientId,
                    tokenFacebookPageUserId: token?.facebookPageUserId,
                    tokenChannel: token?.channel,
                    messageHasText: !!textPreview,
                    messageTextPreview: textPreview
                  });
                } catch {
                  // ignore log errors
                }

                handleMessage(
                  token,
                  normalized,
                  channel,
                  companyIdFromParams ?? token.companyId
                );
              })();
            });
          });
        }
      }

      return res.status(200).json({
        message: "EVENT_RECEIVED"
      });
    }

    return res.status(404).json({
      message: body
    });
  } catch (error) {
    return res.status(500).json({
      message: error
    });
  }
};
