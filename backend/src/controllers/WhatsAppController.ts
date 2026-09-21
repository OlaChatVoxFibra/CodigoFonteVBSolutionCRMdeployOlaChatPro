/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import cacheLayer from "../libs/cache";
import { removeWbot, restartWbot } from "../libs/wbot";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import {
  getAccessTokenFromPage,
  getPageProfile,
  subscribeApp,
  getInstagramBusinessAccountFromPage
} from "../services/FacebookServices/graphAPI";
import ShowPlanService from "../services/PlanService/ShowPlanService";
import { resolveUseWhatsappOfficial } from "../helpers/companyPlanFeatures";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import { closeTicketsImported } from "../services/WhatsappService/ImportWhatsAppMessageService";
import ShowWhatsAppServiceAdmin from "../services/WhatsappService/ShowWhatsAppServiceAdmin";
import UpdateWhatsAppServiceAdmin from "../services/WhatsappService/UpdateWhatsAppServiceAdmin";
import ListAllWhatsAppsService from "../services/WhatsappService/ListAllWhatsAppService";
import ListFilterWhatsAppsService from "../services/WhatsappService/ListFilterWhatsAppsService";
import { isDevNoDb } from "../helpers/devNoDbAuth";
import User from "../models/User";
import logger from "../utils/logger";
import {
  DeleteConnectionWhatsAppOficial,
  getTemplatesWhatsAppOficial
} from "../libs/whatsAppOficial/whatsAppOficial.service";
import {
  finalizeWhatsAppOficialConnection,
  isExternalApiConfigured,
  repairWhatsAppOficialWebhookUrls,
  resolveBackendBaseUrl
} from "../services/WhatsAppOficial/FinalizeWhatsAppOficialConnection";
import {
  describePhoneCloudStatus,
  getWhatsAppPhoneCloudStatus,
  registerWhatsAppCloudPhone
} from "../services/WhatsAppOficial/registerWhatsAppCloudPhone";
import { syncWhatsAppMetaPhoneProfile } from "../services/WhatsAppOficial/syncWhatsAppMetaPhoneProfile";
import {
  listWabaSubscribedApps,
  subscribeWabaWebhooks
} from "../services/WhatsAppOficial/subscribeWabaWebhooks";
import {
  getMetaAccessToken,
  validateMetaAccessToken
} from "../services/WhatsAppOficial/metaWhatsAppAuth";
import { completeWhatsAppEmbeddedSignup } from "../services/WhatsAppOficial/completeWhatsAppEmbeddedSignup";
import {
  getCompanyMetaEmbeddedConfig,
  saveCompanyMetaEmbeddedConfig
} from "../services/WhatsAppOficial/companyMetaEmbeddedConfig";
import axios from "axios";
import QuickMessageComponent from "../models/QuickMessageComponent";
import CreateService from "../services/QuickMessageService/CreateService";
import QuickMessage from "../models/QuickMessage";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  maxUseBotQueues?: string;
  timeUseBotQueues?: string;
  expiresTicket?: number;
  allowGroup?: false;
  sendIdQueue?: number;
  timeSendQueue?: number;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  ratingMessage?: string;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  expiresInactiveMessage?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  importOldMessagesGroups?: boolean;
  closedTicketsPostImported?: boolean;
  groupAsTicket?: string;
  timeCreateNewTicket?: number;
  schedules?: any[];
  promptId?: number;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  phone_number_id?: string;
  waba_id?: string;
  send_token?: string;
  business_id?: string;
  phone_number?: string;
  waba_webhook?: string;
  channel?: string;
  triggerIntegrationOnClose?: boolean;
  color?: string;
  agentDisabled?: boolean;
  queuesEnabled?: boolean;
  sendGreetingMessage?: boolean;
  sendFarewellMessage?: boolean;
  sendQueueEntryMessage?: string;
  queueEntryMessage?: string;
}

interface QueryParams {
  session?: number | string;
  channel?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (isDevNoDb()) {
    return res.status(200).json([]);
  }
  const { companyId, super: isSuper } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListWhatsAppsService({ companyId, session, isSuper });

  return res.status(200).json(whatsapps);
};

export const indexFilter = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { session, channel } = req.query as QueryParams;

  const whatsapps = await ListFilterWhatsAppsService({
    companyId,
    session,
    channel
  });

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, super: isSuper } = req.user;
  const data = req.body;
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    allowGroup,
    timeSendQueue,
    sendIdQueue,
    timeInactiveMessage,
    inactiveMessage,
    ratingMessage,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    expiresInactiveMessage,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    groupAsTicket,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    business_id,
    phone_number,
    color,
    waba_webhook,
    channel,
    agentDisabled,
    queuesEnabled,
    sendGreetingMessage,
    sendFarewellMessage,
    sendQueueEntryMessage,
    queueEntryMessage
  }: WhatsappData = data;

  // Sanitização de dados críticos para evitar espaços em branco acidentais
  const token = data.token ? data.token.trim() : null;
  const phone_number_id = data.phone_number_id ? data.phone_number_id.trim() : null;
  const waba_id = data.waba_id ? data.waba_id.trim() : null;
  const send_token = data.send_token
    ? data.send_token.replace(/\s+/g, "").trim()
    : null;

  const targetCompanyId = isSuper && data.companyId ? data.companyId : companyId;

  const company = await ShowCompanyService(targetCompanyId);
  const plan = await ShowPlanService(company.planId);

  if (channel === "whatsapp_oficial") {
    if (!resolveUseWhatsappOfficial(company)) {
      return res.status(400).json({
        error: "Seu plano não inclui WhatsApp API Oficial. Entre em contato com o suporte."
      });
    }
  } else if (!plan.useWhatsapp) {
    return res.status(400).json({
      error: "Você não possui permissão para acessar este recurso!"
    });
  }

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
    companyId: targetCompanyId,
    token,
    maxUseBotQueues,
    timeUseBotQueues,
    expiresTicket,
    allowGroup,
    timeSendQueue,
    sendIdQueue,
    timeInactiveMessage,
    inactiveMessage,
    ratingMessage,
    maxUseBotQueuesNPS,
    expiresTicketNPS,
    whenExpiresTicket,
    expiresInactiveMessage,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    groupAsTicket,
    timeCreateNewTicket,
    schedules,
    promptId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    phone_number_id,
    waba_id,
    send_token,
    business_id,
    phone_number,
    waba_webhook,
    channel,
    color,
    agentDisabled,
    queuesEnabled,
    sendGreetingMessage,
    sendFarewellMessage,
    sendQueueEntryMessage,
    queueEntryMessage
  });

  if (["whatsapp_oficial"].includes(whatsapp.channel)) {
    try {
      await finalizeWhatsAppOficialConnection(whatsapp);
      if (!isExternalApiConfigured()) {
        await syncWhatsAppMetaPhoneProfile(whatsapp);
      }
    } catch (error: any) {
      logger.error(
        `[WABA] Erro ao finalizar conexão oficial ${whatsapp.id}: ${error?.message || error}`
      );
    }
  }

  if (["whatsapp"].includes(whatsapp.channel)) {
    // Não aguardar o início da sessão para não bloquear a resposta da API
    StartWhatsAppSession(whatsapp, targetCompanyId).catch(err => {
      logger.error(`Error starting WhatsApp session: ${err}`);
    });
  }

  const io = getIO();
  io.of("/" + String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.of("/" + String(oldDefaultWhatsapp.companyId)).emit(`company-${oldDefaultWhatsapp.companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const storeFacebook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      facebookUserId,
      facebookUserToken,
      addInstagram
    }: {
      facebookUserId: string;
      facebookUserToken: string;
      addInstagram: boolean;
    } = req.body;
    const { companyId } = req.user;

    logger.info("[storeFacebook] Início", {
      companyId,
      facebookUserId,
      addInstagram: !!addInstagram,
      tokenLength: facebookUserToken?.length ?? 0
    });

    const rawPages = await getPageProfile(facebookUserId, facebookUserToken);
    const data = rawPages?.data;

    if (!data || data.length === 0) {
      logger.warn("[storeFacebook] Nenhuma página retornada", {
        facebookUserId,
        hasRawPages: !!rawPages,
        rawKeys: rawPages ? Object.keys(rawPages) : []
      });
      return res.status(400).json({
        error: "Nenhuma página do Facebook encontrada para esta conta. Vincule uma página em facebook.com/pages."
      });
    }
    const io = getIO();

    const pages = [];
    for await (const page of data) {
      const { name, access_token, id, instagram_business_account } = page;

      logger.info("[storeFacebook][Page]", {
        companyId,
        pageId: id,
        pageName: name,
        addInstagram,
        hasInstagramBusinessAccountInList: !!instagram_business_account,
        instagramBusinessAccountIdInList: instagram_business_account?.id || null
      });

      // A troca de token para "long-lived" pode falhar se o app credentials estiverem
      // divergentes/incompletos. Para não bloquear a conexão (e permitir webhooks/tickets),
      // fazemos fallback para o token original retornado pela Graph API.
      let acessTokenPage = access_token;
      try {
        acessTokenPage = await getAccessTokenFromPage(access_token);
      } catch (err: any) {
        logger.warn("[storeFacebook] Falha ao trocar token da página. Usando token original.", {
          facebookUserId,
          facebookPageId: id,
          hasInstagramBusinessAccount: !!instagram_business_account,
          error: err?.message
        });
      }

      // Se o list endpoint não retornar instagram_business_account, tentamos recuperar via endpoint do próprio Page.
      // IMPORTANTE: para não depender de um formato/endpoint específico do Graph,
      // quando `addInstagram` estiver ativo tentamos resolver novamente via Page token.
      let instagramBusinessAccount = instagram_business_account;
      if (addInstagram) {
        // 1) Tenta com o token da página (long-lived, se possível)
        const resolvedWithPageToken = await getInstagramBusinessAccountFromPage(id, acessTokenPage);
        if (resolvedWithPageToken?.id) instagramBusinessAccount = resolvedWithPageToken;
        else {
          // 2) Fallback: tenta com o token original do usuário
          // (alguns apps/escopos deixam a leitura do vínculo IG apenas no token do usuário)
          const resolvedWithUserToken = await getInstagramBusinessAccountFromPage(id, facebookUserToken);
          if (resolvedWithUserToken?.id) instagramBusinessAccount = resolvedWithUserToken;
        }
      }

      if (addInstagram) {
        logger.info("[storeFacebook][InstagramResolve]", {
          companyId,
          pageId: id,
          addInstagram,
          instagramResolved: !!instagramBusinessAccount,
          instagramBusinessAccountId: instagramBusinessAccount?.id || null,
          instagramResolvedUsername: instagramBusinessAccount?.username || null
        });
      }

      // Sempre garante a conexão do Page no canal "facebook".
      // Isso evita o bug onde a conexão do facebook não é criada quando o Graph já traz o IG linked.
      pages.push({
        companyId,
        name,
        facebookUserId: facebookUserId,
        facebookPageUserId: id,
        facebookUserToken: acessTokenPage,
        tokenMeta: facebookUserToken,
        isDefault: false,
        channel: "facebook",
        status: "CONNECTED",
        greetingMessage: "",
        farewellMessage: "",
        queueIds: [],
        isMultidevice: false
      });

      // Inscreve webhook na Página do Facebook (necessário para receber eventos do canal "facebook").
      try {
        await subscribeApp(id, acessTokenPage);
      } catch (err: any) {
        logger.warn("[storeFacebook] Falha ao inscrever webhook na Página do Facebook.", {
          facebookPageId: id,
          error: err?.message
        });
      }

      // Se conseguir resolver o IG business account, cria também a conexão "instagram" e subscreve webhooks nela.
      if (addInstagram) {
        if (instagramBusinessAccount) {
          const { id: instagramId, username, name: instagramName } = instagramBusinessAccount;

          pages.push({
            companyId,
            name: `Insta ${username || instagramName}`,
            facebookUserId: facebookUserId,
            facebookPageUserId: instagramId,
            facebookUserToken: acessTokenPage,
            tokenMeta: facebookUserToken,
            isDefault: false,
            channel: "instagram",
            status: "CONNECTED",
            greetingMessage: "",
            farewellMessage: "",
            queueIds: [],
            isMultidevice: false
          });

          try {
            await subscribeApp(instagramId, acessTokenPage);
          } catch (err: any) {
            logger.warn("[storeFacebook] Falha ao inscrever webhook na conta do Instagram.", {
              instagramBusinessAccountId: instagramId,
              error: err?.message
            });
          }
        } else {
          // Não criar conexão "instagram" sem ID real da conta profissional.
          // Conexão placeholder com pageId pode gerar roteamento inconsistente
          // de webhooks e tickets "sumidos" no painel.
          logger.warn("[storeFacebook] Instagram não resolvido para a página. Conexão IG não será criada.", {
            companyId,
            pageId: id,
            pageName: name
          });
        }
      }
    }

    for await (const pageConection of pages) {
      const exist = await Whatsapp.findOne({
        where: {
          facebookPageUserId: pageConection.facebookPageUserId,
          channel: pageConection.channel,
          companyId
        }
      });

      let whatsapp;
      if (exist) {
        await exist.update({
          ...pageConection
        });
        whatsapp = exist;
      } else {
        const created = await CreateWhatsAppService(pageConection);
        whatsapp = created.whatsapp;
      }

      io.of("/" + String(companyId)).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
      });
    }
    logger.info("[storeFacebook] Conexão(ões) criada(s) com sucesso", { companyId, pagesCount: pages.length });
    return res.status(200).json({ ok: true, count: pages.length });
  } catch (error: any) {
    logger.error("[storeFacebook] Erro ao conectar Facebook/Instagram", {
      message: error?.message,
      stack: error?.stack,
      responseStatus: error?.response?.status,
      responseData: error?.response?.data
    });

    const message = error?.message;
    if (message === "ERR_FETCHING_FB_PAGES") {
      return res.status(400).json({
        error: "Nenhuma página do Facebook encontrada para esta conta ou token expirado. Tente fazer login novamente."
      });
    }
    if (message === "ERR_FETCHING_FB_USER_TOKEN") {
      return res.status(400).json({
        error: "Não foi possível validar o token. Verifique FACEBOOK_APP_ID e FACEBOOK_APP_SECRET no servidor."
      });
    }
    if (message === "ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS") {
      return res.status(400).json({
        error: "Erro ao inscrever a página no webhook. Verifique as permissões do app na Meta."
      });
    }

    return res.status(400).json({
      error: "Erro ao conectar ao Facebook. Tente novamente ou verifique as permissões do app."
    });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, id: userId } = req.user;
  const { session } = req.query as QueryParams;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, session, +userId);

  return res.status(200).json(whatsapp);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId, id: userId } = req.user;

  // Sanitização de dados críticos no update também
  if (whatsappData.token) whatsappData.token = whatsappData.token.trim();
  if (whatsappData.phone_number_id) whatsappData.phone_number_id = whatsappData.phone_number_id.trim();
  if (whatsappData.waba_id) whatsappData.waba_id = whatsappData.waba_id.trim();
  if (whatsappData.send_token) {
    whatsappData.send_token = whatsappData.send_token.replace(/\s+/g, "").trim();
  }

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId,
    requestUserId: +userId
  });

  if (whatsapp.channel === "whatsapp_oficial" && !isExternalApiConfigured()) {
    const token = getMetaAccessToken(whatsapp);
    if (token) {
      const validation = await validateMetaAccessToken(
        token,
        whatsapp.phone_number_id
      );
      if (!validation.valid) {
        throw new AppError(
          validation.error || "Token Meta inválido após atualização",
          400
        );
      }
    }
    try {
      await finalizeWhatsAppOficialConnection(whatsapp);
    } catch (error: any) {
      logger.warn(
        `[WABA] Falha ao re-finalizar conexão ${whatsapp.id}: ${error?.message}`
      );
    }
    if (!isExternalApiConfigured()) {
      try {
        await syncWhatsAppMetaPhoneProfile(whatsapp);
      } catch (syncErr: any) {
        logger.warn(
          `[WABA] Falha sync perfil Meta ${whatsapp.id}: ${syncErr?.message}`
        );
      }
    }
  }

  const io = getIO();
  io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.of(String(oldDefaultWhatsapp.companyId)).emit(`company-${oldDefaultWhatsapp.companyId}-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const closedTickets = async (req: Request, res: Response) => {
  const { whatsappId } = req.params;

  closeTicketsImported(whatsappId);

  return res.status(200).json("whatsapp");
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId, profile, id: userId } = req.user;
  const io = getIO();

  // Mesma regra de restart: admin ou usuário com conexões habilitadas (req.user.super do JWT nunca é preenchido).
  const requestUser = await User.findByPk(userId);
  const { allowConnections } = requestUser || { allowConnections: "disabled" as const };
  if (profile !== "admin" && allowConnections === "disabled") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, +userId);

  if (whatsapp.channel === "whatsapp") {
    /** Encerra socket antes do DELETE; falhas aqui não podem impedir remoção no BD. */
    try {
      await removeWbot(+whatsappId, true);
    } catch (err) {
      logger.error({ err, whatsappId }, "removeWbot failed during whatsapp delete");
    }
    try {
      await DeleteBaileysService(whatsappId);
    } catch (err) {
      logger.error({ err, whatsappId }, "DeleteBaileysService failed during whatsapp delete");
    }
    await DeleteWhatsAppService(whatsappId);
    try {
      await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    } catch (err) {
      logger.error({ err, whatsappId }, "cache del failed during whatsapp delete");
    }

    io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  if (whatsapp.channel === "whatsapp_oficial") {
    await Whatsapp.destroy({
      where: {
        id: +whatsappId
      }
    });

    try {
      await DeleteConnectionWhatsAppOficial(whatsapp.waba_webhook_id);
    } catch (error) {
      logger.info("ERROR", error);
    }

    io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({
      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
      where: {
        facebookUserToken
      }
    });

    for await (const whatsapp of getAllSameToken) {
      io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
        action: "delete",
        whatsappId: whatsapp.id
      });
    }
  }

  const removedKnownChannel =
    whatsapp.channel === "whatsapp" ||
    whatsapp.channel === "whatsapp_oficial" ||
    whatsapp.channel === "facebook" ||
    whatsapp.channel === "instagram";

  if (!removedKnownChannel) {
    await DeleteWhatsAppService(whatsappId);
    io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile, id } = req.user;

  const user = await User.findByPk(id);
  const { allowConnections } = user;

  if (profile !== "admin" && allowConnections === "disabled") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await restartWbot(companyId);

  return res.status(200).json({ message: "Whatsapp restart." });
};

export const listAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const requestUser = await User.findByPk(req.user.id, { attributes: ["super"] });
  const scopeCompanyId = requestUser?.super ? undefined : companyId;
  const whatsapps = await ListAllWhatsAppsService({ session, companyId: scopeCompanyId });
  return res.status(200).json(whatsapps);
};

export const updateAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppServiceAdmin({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`admin-whatsapp`, {
    action: "update",
    whatsapp
  });

  if (oldDefaultWhatsapp) {
    io.of(String(companyId)).emit(`admin-whatsapp`, {
      action: "update",
      whatsapp: oldDefaultWhatsapp
    });
  }

  return res.status(200).json(whatsapp);
};

export const removeAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const io = getIO();
  console.log("REMOVING WHATSAPP ADMIN", whatsappId);
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.channel === "whatsapp") {
    try {
      await removeWbot(+whatsappId, true);
    } catch (err) {
      logger.error({ err, whatsappId }, "removeWbot failed during whatsapp delete (admin)");
    }
    try {
      await DeleteBaileysService(whatsappId);
    } catch (err) {
      logger.error({ err, whatsappId }, "DeleteBaileysService failed during whatsapp delete (admin)");
    }
    await DeleteWhatsAppService(whatsappId);
    try {
      await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    } catch (err) {
      logger.error({ err, whatsappId }, "cache del failed during whatsapp delete (admin)");
    }

    io.of(String(companyId)).emit(`admin-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  if (whatsapp.channel === "whatsapp_oficial") {
    await Whatsapp.destroy({
      where: {
        id: +whatsappId
      }
    });

    try {
      await DeleteConnectionWhatsAppOficial(whatsapp.waba_webhook_id);
    } catch (error) {
      logger.info("ERROR", error);
    }

    io.of(String(whatsapp.companyId)).emit(`company-${whatsapp.companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({
      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
      where: {
        facebookUserToken
      }
    });

    for await (const whatsapp of getAllSameToken) {
      io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
        action: "delete",
        whatsappId: whatsapp.id
      });
    }
  }

  const removedKnownChannelAdmin =
    whatsapp.channel === "whatsapp" ||
    whatsapp.channel === "whatsapp_oficial" ||
    whatsapp.channel === "facebook" ||
    whatsapp.channel === "instagram";

  if (!removedKnownChannelAdmin) {
    await DeleteWhatsAppService(whatsappId);
    io.of(String(companyId)).emit(`company-${companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export const showAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  // console.log("SHOWING WHATSAPP ADMIN", whatsappId)
  const whatsapp = await ShowWhatsAppServiceAdmin(whatsappId);

  return res.status(200).json(whatsapp);
};

export const repairOficial = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp || whatsapp.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (whatsapp.channel !== "whatsapp_oficial") {
    throw new AppError("Conexão não é WhatsApp API Oficial", 400);
  }

  if (!isExternalApiConfigured()) {
    await repairWhatsAppOficialWebhookUrls();
    await whatsapp.reload();
  }

  const token = getMetaAccessToken(whatsapp);
  let tokenValidation = token
    ? await validateMetaAccessToken(token, whatsapp.phone_number_id)
    : { valid: false, error: "Token não configurado" };

  let tokenRefreshed = false;
  if (!tokenValidation.valid && token) {
    try {
      const { getCompanyMetaEmbeddedConfig } = await import(
        "../services/WhatsAppOficial/companyMetaEmbeddedConfig"
      );
      const { exchangeMetaTokenToLongLived } = await import(
        "../services/WhatsAppOficial/exchangeMetaTokenToLongLived"
      );
      const metaConfig = await getCompanyMetaEmbeddedConfig(companyId);
      const longLived = await exchangeMetaTokenToLongLived(token, {
        clientId: metaConfig.appId,
        clientSecret: metaConfig.appSecret
      });
      if (longLived?.accessToken) {
        await whatsapp.update({ send_token: longLived.accessToken });
        await whatsapp.reload();
        tokenValidation = await validateMetaAccessToken(
          longLived.accessToken,
          whatsapp.phone_number_id
        );
        tokenRefreshed = !!tokenValidation.valid;
      }
    } catch {
      /* mantém validação original */
    }
  }

  const phoneCloud = !isExternalApiConfigured()
    ? await getWhatsAppPhoneCloudStatus(whatsapp)
    : {};

  const wabaSubscription = !isExternalApiConfigured()
    ? await subscribeWabaWebhooks(whatsapp)
    : { success: true, skipped: true };

  const subscribedApps = !isExternalApiConfigured()
    ? await listWabaSubscribedApps(whatsapp)
    : { data: [] };

  const cloudRegistration =
    !isExternalApiConfigured() &&
    phoneCloud.status !== "CONNECTED"
      ? await registerWhatsAppCloudPhone(whatsapp)
      : {
          success: true,
          skipped: true,
          skipReason:
            phoneCloud.status === "CONNECTED"
              ? "already_connected"
              : "not_required"
        };

  const backendUrl = resolveBackendBaseUrl();
  const recommendedWebhook = /^https:\/\//i.test(backendUrl)
    ? `${backendUrl.replace(/\/$/, "")}/v1/webhook/waba`
    : null;

  const webhookHasInternalPort =
    !!whatsapp.waba_webhook &&
    /^https:\/\/[^/]+:(8080|3000|5000)\//i.test(whatsapp.waba_webhook);

  if (!isExternalApiConfigured()) {
    try {
      await syncWhatsAppMetaPhoneProfile(whatsapp);
    } catch {
      /* optional */
    }
  }

  return res.status(200).json({
    ok: true,
    waba_webhook: whatsapp.waba_webhook,
    recommendedWebhook,
    webhookHasInternalPort,
    webhookFixed: whatsapp.waba_webhook === recommendedWebhook,
    tokenValid: tokenValidation.valid,
    tokenError: tokenValidation.error || null,
    tokenRefreshed,
    wabaSubscription,
    subscribedAppsCount: subscribedApps.data?.length || 0,
    subscribedApps: subscribedApps.data,
    cloudRegistration,
    phoneCloudStatus: phoneCloud.status || null,
    phoneCloudStatusHint: describePhoneCloudStatus(phoneCloud.status),
    facebookAppSecretConfigured: !!(process.env.FACEBOOK_APP_SECRET || "").trim(),
    metaWebhookHint:
      (subscribedApps.data?.length || 0) === 0
        ? "Nenhum app inscrito nos webhooks desta WABA — use Reparar conexão após o deploy."
        : "No Meta use exatamente recommendedWebhook (sem :8080). FACEBOOK_APP_SECRET no Railway = App Secret do app Meta."
  });
};

export const metaHealth = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp || whatsapp.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (whatsapp.channel !== "whatsapp_oficial") {
    throw new AppError("Conexão não é WhatsApp API Oficial", 400);
  }

  const token = getMetaAccessToken(whatsapp);
  const tokenValidation = token
    ? await validateMetaAccessToken(token, whatsapp.phone_number_id)
    : { valid: false, error: "Token não configurado" };

  const backendUrl = resolveBackendBaseUrl();
  const recommendedWebhook = /^https:\/\//i.test(backendUrl)
    ? `${backendUrl.replace(/\/$/, "")}/v1/webhook/waba`
    : null;

  const webhookHasInternalPort =
    !!whatsapp.waba_webhook &&
    /^https:\/\/[^/]+:(8080|3000|5000)\//i.test(whatsapp.waba_webhook);

  const phoneCloud = !isExternalApiConfigured()
    ? await getWhatsAppPhoneCloudStatus(whatsapp)
    : {};

  if (!isExternalApiConfigured()) {
    try {
      await syncWhatsAppMetaPhoneProfile(whatsapp);
    } catch {
      /* optional */
    }
  }

  return res.status(200).json({
    connectionId: whatsapp.id,
    name: whatsapp.name,
    status: whatsapp.status,
    phone_number_id: whatsapp.phone_number_id,
    waba_id: whatsapp.waba_id,
    waba_webhook: whatsapp.waba_webhook,
    recommendedWebhook,
    webhookIsPublic:
      !!whatsapp.waba_webhook &&
      !/localhost|127\.0\.0\.1/i.test(whatsapp.waba_webhook),
    webhookHasInternalPort,
    webhookMatchesRecommended: whatsapp.waba_webhook === recommendedWebhook,
    phoneCloudStatus: phoneCloud.status || whatsapp.meta_phone_status || null,
    phoneCloudStatusHint: describePhoneCloudStatus(
      phoneCloud.status || whatsapp.meta_phone_status
    ),
    meta_quality_rating: whatsapp.meta_quality_rating || null,
    meta_messaging_limit: whatsapp.meta_messaging_limit || null,
    meta_verified_name: whatsapp.meta_verified_name || null,
    meta_health_synced_at: whatsapp.meta_health_synced_at || null,
    tokenConfigured: !!token,
    tokenLength: token?.length || 0,
    tokenValid: tokenValidation.valid,
    tokenError: tokenValidation.error || null,
    tokenErrorCode: tokenValidation.code || null,
    verifyTokenHint: process.env.VERIFY_TOKEN || "vbsolution",
    facebookAppSecretConfigured: !!(process.env.FACEBOOK_APP_SECRET || "").trim(),
    inboundHint:
      phoneCloud.status && phoneCloud.status !== "CONNECTED"
        ? describePhoneCloudStatus(phoneCloud.status)
        : webhookHasInternalPort
          ? "URL no sistema está com porta interna (:8080). No Meta use recommendedWebhook."
          : !tokenValidation.valid
            ? "Token Meta inválido — salve token permanente."
            : !(process.env.FACEBOOK_APP_SECRET || "").trim()
              ? "Configure FACEBOOK_APP_SECRET no Railway (igual ao App Secret do app Meta)."
              : "Se mensagem real não cria ticket, veja logs Railway por 'Assinatura rejeitada'."
  });
};

export const syncTemplatesOficial = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { whatsappId } = req.params;

  const whatsapp = await Whatsapp.findByPk(whatsappId);

  if (!whatsapp || whatsapp.companyId !== companyId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  let templates: any[] = [];

  if (isExternalApiConfigured()) {
    const data = await getTemplatesWhatsAppOficial(whatsapp.token);
    templates = Array.isArray(data?.data) ? data.data : [];
  } else {
    const metaToken = getMetaAccessToken(whatsapp);
    const wabaId = whatsapp.waba_id;

    if (!metaToken || !wabaId) {
      throw new AppError(
        "Credenciais Meta incompletas (WABA ID ou token de acesso)",
        400
      );
    }

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates`,
        {
          headers: { Authorization: `Bearer ${metaToken}` },
          params: { limit: 250 }
        }
      );
      templates = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error: any) {
      const metaError = error?.response?.data?.error;
      const code = metaError?.code;
      const message = metaError?.message || error?.message;

      if (code === 190) {
        throw new AppError(
          "ERR_META_TOKEN_INVALID: Token Meta expirado ou inválido. Gere um novo token permanente no Meta Business e atualize na conexão.",
          400
        );
      }

      throw new AppError(
        message || "Erro ao buscar templates na API oficial do WhatsApp",
        error?.response?.status || 500
      );
    }
  }

  if (templates.length > 0) {
    await Promise.all(
      templates.map(async template => {
        const quickMessage = await QuickMessage.findOne({
          where: {
            metaID: template.id
          },
          include: [
            {
              model: QuickMessageComponent,
              as: "components"
            }
          ]
        });

        if (quickMessage) {
          await quickMessage.update({
            message: template.components?.find((c: any) => c.type === 'BODY' || c.type === 'body')?.text || template.name,
            category: template.category,
            status: template.status,
            language: template.language
          });

          if (template?.components?.length > 0) {
            if (quickMessage?.components?.length > 0) {
              try {
                await QuickMessageComponent.destroy({
                  where: {
                    quickMessageId: quickMessage.id
                  }
                });
              } catch (error) {
                console.error(
                  "Error destroying QuickMessageComponents:",
                  error
                );
              }
            } else {
            }

            await Promise.all(
              template.components.map(async component => {
                await QuickMessageComponent.create({
                  quickMessageId: quickMessage.id,
                  type: component.type,
                  text: component.text,
                  buttons: JSON.stringify(component?.buttons),
                  format: component?.format,
                  example: JSON.stringify(component?.example)
                });
              })
            );
          }
        } else {
          const templateData = {
            shortcode: template.name,
            message: template.components?.find((c: any) => c.type === 'BODY' || c.type === 'body')?.text || template.name,
            companyId: companyId,
            userId: userId,
            geral: true,
            isMedia: false,
            mediaPath: null,
            visao: true,
            isOficial: true,
            language: template.language,
            status: template.status,
            category: template.category,
            metaID: template.id,
            whatsappId: whatsapp.id
          };
          const qm = await CreateService(templateData);

          if (Array.isArray(template.components) && template.components.length > 0) {
            await Promise.all(
              template.components.map(async component => {
                await QuickMessageComponent.create({
                  quickMessageId: qm.id,
                  type: component.type,
                  text: component.text,
                  buttons: JSON.stringify(component?.buttons),
                  format: component?.format,
                  example: JSON.stringify(component?.example)
                });
              })
            );
          }
        }
      })
    );
  }

  if (!isExternalApiConfigured()) {
    try {
      await syncWhatsAppMetaPhoneProfile(whatsapp);
    } catch {
      /* optional */
    }
  }

  return res.status(200).json({ data: templates });
};

export const completeEmbeddedSignup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    code,
    wabaId,
    waba_id,
    phoneNumberId,
    phone_number_id,
    businessId,
    business_id,
    name,
    coexistence,
    whatsappId,
    inlineAppId,
    inlineAppSecret
  } = req.body || {};

  const result = await completeWhatsAppEmbeddedSignup({
    companyId,
    code: String(code || ""),
    wabaId: String(wabaId || waba_id || ""),
    phoneNumberId: String(phoneNumberId || phone_number_id || ""),
    businessId: businessId || business_id,
    name,
    coexistence: coexistence !== false,
    whatsappId: whatsappId ? Number(whatsappId) : undefined,
    inlineAppId: inlineAppId ? String(inlineAppId).trim() : undefined,
    inlineAppSecret: inlineAppSecret ? String(inlineAppSecret).trim() : undefined
  });

  return res.status(200).json({
    whatsapp: result.whatsapp,
    created: result.created,
    coexistenceSync: result.coexistenceSync,
    phoneMeta: result.phoneMeta,
    message: result.created
      ? "Conexão criada via Meta Embedded Signup."
      : "Conexão atualizada via Meta Embedded Signup."
  });
};

export const getEmbeddedSignupConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const config = await getCompanyMetaEmbeddedConfig(companyId);

  return res.status(200).json({
    appId: config.appId,
    configId: config.configId,
    configured: config.configured,
    hasAppSecret: config.hasAppSecret,
    source: config.source
  });
};

export const updateEmbeddedSignupConfig = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { appId, configId, appSecret } = req.body || {};

  await saveCompanyMetaEmbeddedConfig({
    companyId,
    appId,
    configId,
    appSecret
  });

  const config = await getCompanyMetaEmbeddedConfig(companyId);

  return res.status(200).json({
    appId: config.appId,
    configId: config.configId,
    configured: config.configured,
    hasAppSecret: config.hasAppSecret,
    source: config.source,
    message: "Configuração Meta Embedded Signup salva para esta organização."
  });
};