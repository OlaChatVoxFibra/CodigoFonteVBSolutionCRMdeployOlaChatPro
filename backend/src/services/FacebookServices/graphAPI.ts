/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import logger from "../../utils/logger";
import { isNil } from "lodash";
const formData: FormData = new FormData();

const apiBase = (token: string) =>
  axios.create({
    baseURL: "https://graph.facebook.com/v20.0/",
    params: {
      access_token: token
    }
  });

export const getAccessToken = async (): Promise<string> => {
  const { data } = await axios.get(
    "https://graph.facebook.com/v20.0/oauth/access_token",
    {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: "client_credentials"
      }
    }
  );

  return data.access_token;
};

export const markSeen = async (id: string, token: string): Promise<void> => {
  await apiBase(token).post(`${id}/messages`, {
    recipient: {
      id
    },
    sender_action: "mark_seen"
  });
};

export const showTypingIndicator = async (
  id: string, 
  token: string,
  action: string
): Promise<void> => {

  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id: id
      },
      sender_action: action
    })

    return data;
  } catch (error) {
    //console.log(error);
  }

}

export const sendText = async (
  id: string | number,
  text: string,
  token: string,
  tag?: string | null
): Promise<void> => {
  try {
    if (!isNil(tag)) {
      const { data } = await apiBase(token).post("me/messages", {
        recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
        messaging_type: "MESSAGE_TAG",
        tag: tag
      });
      return data;
    } else {
      const { data } = await apiBase(token).post("me/messages", {
        recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
      });
      return data;
    }
  } catch (error) {
    const status = (error as any)?.response?.status;
    const data = (error as any)?.response?.data;
    logger.error(`ERR_SENDING_MESSAGE_TO_FACEBOOK_TRY_3: Axios ${status} ${JSON.stringify(data)}`);
    if (status === 401) {
      // Token expirado ou inválido
      throw new Error("ERR_SESSION_EXPIRED");
    }
    try {
      if (!isNil(tag)) {
        const { data } = await apiBase(token).post("me/messages", {
          recipient: {
          id
        },
        message: {
          text: `${text}`,
        },
        messaging_type: "MESSAGE_TAG",
        tag: tag
        });
        return data;
      } else {
        throw new Error("ERR_SENDING_MESSAGE_TO_FACEBOOK_TRY_3");
      }
    } catch (error) {
      console.log(error);
    }
  }
};

export const sendAttachmentFromUrl = async (
  id: string,
  url: string,
  type: string,
  token: string,
  tag?: string | null
): Promise<void> => {
  try {
    const payload: Record<string, unknown> = {
      recipient: { id },
      message: {
        attachment: {
          type,
          payload: { url }
        }
      }
    };

    if (!isNil(tag)) {
      payload.messaging_type = "MESSAGE_TAG";
      payload.tag = tag;
    }

    const { data } = await apiBase(token).post("me/messages", payload);
    return data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const sendAttachment = async (
  id: string,
  file: Express.Multer.File,
  type: string,
  token: string
): Promise<void> => {
  formData.append(
    "recipient",
    JSON.stringify({
      id
    })
  );

  formData.append(
    "message",
    JSON.stringify({
      attachment: {
        type,
        payload: {
          is_reusable: true
        }
      }
    })
  );

  const fileReaderStream = createReadStream(file.path);

  formData.append("filedata", fileReaderStream);

  try {
    await apiBase(token).post("me/messages", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const genText = (text: string): any => {
  const response = {
    text
  };

  return response;
};

export const getProfile = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${id}?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user&access_token=${token}`
    );
    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_PROFILE_2");
  }
};

export const getPageProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    logger.info("[getPageProfile] Chamando Graph API", { userId: id, tokenLength: token?.length ?? 0 });
    const endpoints = [
      // mais simples (geralmente funciona em mais casos)
      `${id}/accounts?fields=name,access_token,instagram_business_account{id}`,
      `${id}/accounts?fields=name,access_token,instagram_business_account`,
      // variação comum em alguns casos
      `${id}/accounts?fields=name,access_token,instagram_business_accounts{id}`
    ];

    let response: any = null;
    for (const endpoint of endpoints) {
      try {
        response = await apiBase(token).get(endpoint);
        break;
      } catch (e) {
        // tenta próximo endpoint
      }
    }

    if (!response) throw new Error("ERR_FETCHING_FB_PAGES");

    const data = response.data;

    if (data?.error) {
      logger.error("[getPageProfile] Graph API retornou erro", {
        code: data.error.code,
        message: data.error.message,
        type: data.error.type,
        subcode: data.error.error_subcode
      });
      throw new Error(`ERR_FETCHING_FB_PAGES: ${data.error.message || data.error.code}`);
    }

    if (!Array.isArray(data?.data)) {
      logger.warn("[getPageProfile] Resposta sem array data", { keys: data ? Object.keys(data) : [] });
      return { data: [] };
    }

    logger.info("[getPageProfile] Páginas encontradas", { count: data.data.length });
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    const errData = error?.response?.data;
    logger.error("[getPageProfile] Falha na requisição", {
      message: error?.message,
      status,
      apiError: errData?.error?.message || errData?.error?.code,
      apiErrorType: errData?.error?.type
    });
    throw new Error("ERR_FETCHING_FB_PAGES");
  }
};

export const getInstagramBusinessAccountFromPage = async (
  pageId: string,
  pageToken: string
): Promise<any> => {
  // Graph costuma variar o formato do campo/endpoint retornado conforme token/permissões.
  // Então aqui fazemos 2 tentativas e um parser bem permissivo.
  // A API pode rejeitar campos específicos dependendo do token/nível de acesso,
  // então tentamos múltiplos conjuntos de fields (do mais simples pro mais completo).
  const fieldSets = [
    "id",
    "id,username",
    "id,username,name",
    "id,username,name,profile_picture_url"
  ];

  const extract = (payload: any): any => {
    if (!payload) return null;

    // Caso 1: /{pageId}?fields=instagram_business_account{...}
    if (payload?.instagram_business_account?.id) return payload.instagram_business_account;
    if (Array.isArray(payload?.instagram_business_account) && payload.instagram_business_account?.[0]?.id) {
      return payload.instagram_business_account[0];
    }
    if (payload?.data?.instagram_business_account?.id) return payload.data.instagram_business_account;
    if (Array.isArray(payload?.data?.instagram_business_account) && payload.data.instagram_business_account?.[0]?.id) {
      return payload.data.instagram_business_account[0];
    }

    // Caso 2: /{pageId}/instagram_business_account?fields=...
    // (pode vir como objeto direto ou como "data")
    if (payload?.id && (payload?.username || payload?.name)) return payload;
    if (payload?.data?.id && (payload?.data?.username || payload?.data?.name)) return payload.data;

    if (Array.isArray(payload?.data) && payload.data[0]?.id) return payload.data[0];
    if (Array.isArray(payload?.data?.instagram_business_account) && payload.data.instagram_business_account[0]?.id) {
      return payload.data.instagram_business_account[0];
    }

    return null;
  };

  const attempts: Array<() => Promise<any>> = [];

  // 1) Tentativas via Page: /{pageId}?fields=...
  attempts.push(async () => {
    const response = await apiBase(pageToken).get(
      `${pageId}?fields=instagram_business_account`
    );
    return extract(response?.data);
  });

  for (const fields of fieldSets) {
    attempts.push(async () => {
      const response = await apiBase(pageToken).get(
        `${pageId}?fields=instagram_business_account{${fields}}`
      );
      return extract(response?.data);
    });
  }

  // 2) Tentativas via sub-recurso: /{pageId}/instagram_business_account(s)?fields=...
  for (const fields of fieldSets) {
    attempts.push(async () => {
      const response = await apiBase(pageToken).get(
        `${pageId}/instagram_business_account?fields=${fields}`
      );
      return extract(response?.data);
    });
    attempts.push(async () => {
      // Alguns casos retornam como lista em plural
      const response = await apiBase(pageToken).get(
        `${pageId}/instagram_business_accounts?fields=${fields}`
      );
      return extract(response?.data);
    });
  }

  for (const attempt of attempts) {
    try {
      const acc = await attempt();
      if (acc?.id) return acc;
    } catch {
      // segue
    }
  }

  return null;
};

export const profilePsid = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v20.0/${id}?access_token=${token}`
    );
    return data;
  } catch (error) {
    await getProfile(id, token);
  }
};

export const subscribeApp = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/v20.0/${id}/subscribed_apps?access_token=${token}`,
      {
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "messaging_handovers",
          "message_deliveries",
          "message_reads",
          "message_echoes",
          "standby"
        ]
      }
    );
    return data;
  } catch (error) {
    console.log(error)
    throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const unsubscribeApp = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await axios.delete(
      `https://graph.facebook.com/v20.0/${id}/subscribed_apps?access_token=${token}`
    );
    return data;
  } catch (error) {
    throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const getSubscribedApps = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
    return data;
  } catch (error) {
    throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
  }
};

export const getAccessTokenFromPage = async (
  token: string
): Promise<string> => {
  try {
    if (!token) throw new Error("ERR_FETCHING_FB_USER_TOKEN");

    const hasAppId = !!process.env.FACEBOOK_APP_ID;
    const hasSecret = !!process.env.FACEBOOK_APP_SECRET;
    logger.info("[getAccessTokenFromPage] Troca de token", { hasAppId, hasSecret });

    const response = await axios.get(
      "https://graph.facebook.com/v20.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: "fb_exchange_token",
          fb_exchange_token: token
        }
      }
    );

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      logger.error("[getAccessTokenFromPage] Resposta sem access_token", { dataKeys: Object.keys(response.data || {}) });
      throw new Error("ERR_FETCHING_FB_USER_TOKEN");
    }
    return accessToken;
  } catch (error: any) {
    const status = error?.response?.status;
    const errData = error?.response?.data;
    logger.error("[getAccessTokenFromPage] Falha na troca de token", {
      message: error?.message,
      status,
      apiError: errData?.error?.message || errData?.error?.code,
      apiErrorType: errData?.error?.type
    });
    throw new Error("ERR_FETCHING_FB_USER_TOKEN");
  }
};

export const removeApplcation = async (
  id: string,
  token: string
): Promise<void> => {
  try {
    await axios.delete(`https://graph.facebook.com/v20.0/${id}/permissions`, {
      params: {
        access_token: token
      }
    });
  } catch (error) {
    logger.error("ERR_REMOVING_APP_FROM_PAGE");
  }
};
