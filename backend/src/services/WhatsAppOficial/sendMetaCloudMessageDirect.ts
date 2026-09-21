/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import {
  getMetaAccessToken,
  getMetaAccessTokenCandidates,
  sanitizeMetaToken
} from "./metaWhatsAppAuth";
import { registerWhatsAppCloudPhone } from "./registerWhatsAppCloudPhone";
import { exchangeMetaTokenToLongLived } from "./exchangeMetaTokenToLongLived";
import { getCompanyMetaEmbeddedConfig } from "./companyMetaEmbeddedConfig";
import {
  IMetaMessageTemplate,
  IMetaMessageinteractive
} from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import logger from "../../utils/logger";

export interface SendMetaCloudDirectParams {
  whatsapp: Whatsapp;
  toNumber: string;
  type: "text" | "template" | "interactive" | "image" | "document" | "video" | "audio";
  textBody?: string;
  template?: IMetaMessageTemplate;
  interactive?: IMetaMessageinteractive;
  mediaId?: string;
  mediaCaption?: string;
  mediaFilename?: string;
}

const normalizeBrazilMobile = (number: string): string => {
  let finalNumber = String(number || "").replace(/\D/g, "");
  if (finalNumber.startsWith("55") && finalNumber.length === 12) {
    const ddd = finalNumber.substring(2, 4);
    const numberPart = finalNumber.substring(4);
    if (["7", "8", "9"].includes(numberPart[0])) {
      finalNumber = `55${ddd}9${numberPart}`;
    }
  }
  return finalNumber;
};

/** Normaliza lista/botões para o schema exato da Cloud API. */
export const normalizeMetaInteractivePayload = (
  interactive: IMetaMessageinteractive | any
): IMetaMessageinteractive => {
  if (!interactive || !interactive.type) {
    throw new Error("Payload interativo inválido.");
  }

  const type = String(interactive.type).toLowerCase() as "button" | "list";
  const bodyText = String(interactive.body?.text || "").trim();
  if (!bodyText) {
    throw new Error("Informe o texto da mensagem interativa.");
  }

  const normalized: any = {
    type,
    body: { text: bodyText }
  };

  if (interactive.footer?.text) {
    normalized.footer = { text: String(interactive.footer.text).trim() };
  }

  if (interactive.header?.type === "text" && interactive.header?.text) {
    normalized.header = {
      type: "text",
      text: String(interactive.header.text).trim()
    };
  }

  if (type === "button") {
    const buttons = (interactive.action?.buttons || [])
      .map((b: any, i: number) => ({
        type: "reply" as const,
        reply: {
          id: String(b?.reply?.id || b?.id || `btn_${i + 1}`).slice(0, 256),
          title: String(b?.reply?.title || b?.title || "").trim().slice(0, 20)
        }
      }))
      .filter((b: any) => b.reply.title);
    if (!buttons.length) {
      throw new Error("Adicione ao menos um botão de resposta.");
    }
    if (buttons.length > 3) {
      throw new Error("Máximo de 3 botões na API oficial.");
    }
    normalized.action = { buttons };
    return normalized;
  }

  const button = String(interactive.action?.button || "").trim().slice(0, 20);
  if (!button) {
    throw new Error("Lista/enquete exige o texto do botão que abre as opções.");
  }

  const sections = (interactive.action?.sections || [])
    .map((section: any, sIdx: number) => {
      const rows = (section?.rows || [])
        .map((row: any, rIdx: number) => {
          const title = String(row?.title || "").trim().slice(0, 24);
          if (!title) return null;
          const item: any = {
            id: String(row?.id || `row_${sIdx + 1}_${rIdx + 1}`).slice(0, 200),
            title
          };
          const desc = String(row?.description || "").trim();
          if (desc) item.description = desc.slice(0, 72);
          return item;
        })
        .filter(Boolean);
      if (!rows.length) return null;
      return {
        title: String(section?.title || "Opções").trim().slice(0, 24) || "Opções",
        rows
      };
    })
    .filter(Boolean);

  if (!sections.length || !sections[0].rows?.length) {
    throw new Error("Adicione ao menos uma opção na enquete.");
  }

  normalized.action = { button, sections };
  return normalized;
};

const persistRefreshedToken = async (
  whatsapp: Whatsapp,
  newToken: string
): Promise<void> => {
  try {
    await whatsapp.update({ send_token: newToken });
    (whatsapp as any).send_token = newToken;
    logger.info(
      `[WABA Auth] Token long-lived salvo na conexão ${whatsapp.id}`
    );
  } catch (e: any) {
    logger.warn(
      `[WABA Auth] Não foi possível salvar token renovado: ${e?.message}`
    );
  }
};

const tryRecoverTokenAfter190 = async (
  whatsapp: Whatsapp,
  failedToken: string
): Promise<string | null> => {
  const candidates = getMetaAccessTokenCandidates(whatsapp).filter(
    (t) => t !== failedToken
  );

  for (const candidate of candidates) {
    try {
      await axios.get(
        `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${candidate}` },
          params: { fields: "id" },
          timeout: 12000
        }
      );
      await persistRefreshedToken(whatsapp, candidate);
      return candidate;
    } catch {
      /* tenta próximo */
    }
  }

  const metaConfig = await getCompanyMetaEmbeddedConfig(whatsapp.companyId);
  const exchanged = await exchangeMetaTokenToLongLived(failedToken, {
    clientId: metaConfig.appId,
    clientSecret: metaConfig.appSecret
  });

  if (exchanged?.accessToken && exchanged.accessToken !== failedToken) {
    try {
      await axios.get(
        `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${exchanged.accessToken}` },
          params: { fields: "id" },
          timeout: 12000
        }
      );
      await persistRefreshedToken(whatsapp, exchanged.accessToken);
      return exchanged.accessToken;
    } catch {
      /* exchange inválido */
    }
  }

  // Tenta trocar cada candidato restante
  for (const candidate of candidates) {
    const alt = await exchangeMetaTokenToLongLived(candidate, {
      clientId: metaConfig.appId,
      clientSecret: metaConfig.appSecret
    });
    if (!alt?.accessToken) continue;
    try {
      await axios.get(
        `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${alt.accessToken}` },
          params: { fields: "id" },
          timeout: 12000
        }
      );
      await persistRefreshedToken(whatsapp, alt.accessToken);
      return alt.accessToken;
    } catch {
      /* próximo */
    }
  }

  return null;
};

export const sendMetaCloudMessageDirect = async (
  params: SendMetaCloudDirectParams
): Promise<string> => {
  const { whatsapp } = params;
  const phoneNumberId = whatsapp.phone_number_id;
  let cleanToken = sanitizeMetaToken(getMetaAccessToken(whatsapp));

  if (!phoneNumberId || !cleanToken) {
    throw new Error(
      "Phone Number ID ou token Meta ausente na conexão WhatsApp API Oficial."
    );
  }

  const to = normalizeBrazilMobile(params.toNumber);
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  let payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to
  };

  switch (params.type) {
    case "text":
      payload.type = "text";
      payload.text = {
        preview_url: false,
        body: String(params.textBody || "").trim()
      };
      if (!(payload.text as { body: string }).body) {
        throw new Error("Mensagem de texto vazia.");
      }
      break;
    case "template":
      payload.type = "template";
      payload.template = params.template;
      break;
    case "interactive":
      payload.type = "interactive";
      payload.interactive = normalizeMetaInteractivePayload(params.interactive);
      break;
    case "image":
      payload.type = "image";
      payload.image = {
        id: params.mediaId,
        ...(params.mediaCaption ? { caption: params.mediaCaption } : {})
      };
      break;
    case "video":
      payload.type = "video";
      payload.video = {
        id: params.mediaId,
        ...(params.mediaCaption ? { caption: params.mediaCaption } : {})
      };
      break;
    case "audio":
      payload.type = "audio";
      payload.audio = { id: params.mediaId };
      break;
    case "document":
      payload.type = "document";
      payload.document = {
        id: params.mediaId,
        ...(params.mediaCaption ? { caption: params.mediaCaption } : {}),
        ...(params.mediaFilename ? { filename: params.mediaFilename } : {})
      };
      break;
    default:
      throw new Error(`Tipo não suportado: ${params.type}`);
  }

  const postToMeta = (token: string) =>
    axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

  try {
    const response = await postToMeta(cleanToken);
    const messageId = response.data?.messages?.[0]?.id;
    if (!messageId) {
      throw new Error("Meta não retornou ID da mensagem.");
    }
    return messageId;
  } catch (err: any) {
    const metaError = err.response?.data?.error;
    if (metaError?.code === 133010) {
      const reg = await registerWhatsAppCloudPhone(whatsapp);
      if (reg.success) {
        const retryResponse = await postToMeta(cleanToken);
        return retryResponse.data?.messages?.[0]?.id;
      }
    }

    if (metaError?.code === 190) {
      const recovered = await tryRecoverTokenAfter190(whatsapp, cleanToken);
      if (recovered) {
        cleanToken = recovered;
        try {
          const retry = await postToMeta(cleanToken);
          const messageId = retry.data?.messages?.[0]?.id;
          if (messageId) return messageId;
        } catch (retryErr: any) {
          const retryMeta = retryErr.response?.data?.error;
          if (retryMeta?.code !== 190) {
            err = retryErr;
          }
        }
      }

      throw new Error(
        "Token Meta expirado ou inválido (#190). O sistema tentou renovar automaticamente. Abra Conexões → WhatsApp Oficial → Reparar conexão ou refaça o login Embedded Signup / cole um System User Token permanente."
      );
    }

    const code = metaError?.code;
    if (code === 131047) {
      throw new Error(
        "Fora da janela de 24h: a Meta só aceita Template aprovado. Use o menu WhatsApp → Template Meta."
      );
    }
    if (code === 131005) {
      throw new Error(
        "Meta recusou o envio (Access denied #131005). Atualize o token permanente da conexão com permissões whatsapp_business_messaging e whatsapp_business_management, ou use Reparar conexão. Se a janela de 24h estiver fechada, envie um Template Meta."
      );
    }
    if (code === 132012) {
      throw new Error(
        "Parâmetros do template não batem com o formato aprovado na Meta (#132012). Confira variáveis do HEADER (texto vs link de mídia), BODY na ordem {{1}}, {{2}}… e botões dinâmicos (URL/cupom)."
      );
    }
    const title = metaError?.error_user_title;
    const userMsg = metaError?.error_user_msg || metaError?.message;
    const parts = [
      userMsg || err.message || "Erro ao enviar mensagem Meta",
      code != null ? `(código ${code})` : null,
      title || null
    ].filter(Boolean);
    throw new Error(parts.join(" — "));
  }
};
