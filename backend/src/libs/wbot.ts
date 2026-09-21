/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs/promises"
import * as Sentry from "@sentry/node";
import makeWASocket, {
  Browsers,
  // CacheStore,
  DisconnectReason,
  WAMessage,
  WAMessageContent,
  WAMessageKey,
  WASocket,
  isJidBroadcast,
  isJidGroup,
  // isJidMetaIa,
  isJidNewsletter,
  isJidStatusBroadcast,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  proto,
} from "baileys";
import { FindOptions } from "sequelize/types";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import MAIN_LOGGER from "baileys/lib/Utils/logger";
import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState";
// import { useMultiFileAuthState } from "../helpers/useMultiFileAuthState_json";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import cacheLayer from "../libs/cache";
import ImportWhatsAppMessageService from "../services/WhatsappService/ImportWhatsAppMessageService";
import { add } from "date-fns";
import moment from "moment";
import { getTypeMessage, isValidMsg } from "../services/WbotServices/wbotMessageListener";
import { addLogs } from "../helpers/addLogs";
import NodeCache from 'node-cache';
import Message from "../models/Message";
import { getVersionByIndexFromUrl } from "../utils/versionHelper";
import path from "path";
import { getGroupMetadataCache, redisGroupCache } from "../utils/RedisGroupCache";

const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "error";

export type Session = WASocket & {
  id?: number;
  myJid?: string;
  myLid?: string;
  store?: (msg: proto.IWebMessageInfo) => void;
};

const sessions: Session[] = [];

const retriesQrCodeMap = new Map<number, number>();

/** Refresh preventivo a cada 1h — reconecta sem logout para manter sessão estável */
const SESSION_KEEPALIVE_MS = 60 * 60 * 1000;
const sessionRefreshTimers = new Map<number, NodeJS.Timeout>();
const sessionRefreshInProgress = new Set<number>();
const preventiveRefreshIds = new Set<number>();

const clearSessionRefreshTimer = (whatsappId: number): void => {
  const timer = sessionRefreshTimers.get(whatsappId);
  if (timer) {
    clearInterval(timer);
    sessionRefreshTimers.delete(whatsappId);
  }
};

export const refreshWbotSession = async (whatsappId: number): Promise<void> => {
  if (sessionRefreshInProgress.has(whatsappId)) return;

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (
    !whatsapp ||
    whatsapp.status !== "CONNECTED" ||
    whatsapp.channel === "whatsapp_oficial"
  ) {
    return;
  }

  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
  if (sessionIndex === -1) return;

  sessionRefreshInProgress.add(whatsappId);
  preventiveRefreshIds.add(whatsappId);
  try {
    logger.info(
      `[WBOT] Refresh preventivo da sessão ${whatsapp.name} (id=${whatsappId}) — mantém credenciais`
    );
    removeWbot(whatsappId, false);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const fresh = await Whatsapp.findByPk(whatsappId);
    if (fresh) {
      await StartWhatsAppSession(fresh, fresh.companyId);
    }
  } catch (err) {
    logger.error(`[WBOT] Erro no refresh preventivo id=${whatsappId}: ${err}`);
  } finally {
    sessionRefreshInProgress.delete(whatsappId);
    preventiveRefreshIds.delete(whatsappId);
  }
};

const scheduleSessionKeepAlive = (whatsapp: Whatsapp): void => {
  clearSessionRefreshTimer(whatsapp.id);
  const timer = setInterval(() => {
    refreshWbotSession(whatsapp.id).catch(err => logger.error(err));
  }, SESSION_KEEPALIVE_MS);
  sessionRefreshTimers.set(whatsapp.id, timer);
};

async function deleteFolder(folder) {
  try {
    await fs.rm(folder, { recursive: true });
    console.log('Pasta deletada com sucesso!', folder);
  } catch (err) {
    console.error('Erro ao deletar pasta:', err);
  }
}

export const getWbot = async (whatsappId: number): Promise<Session> => {
  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (whatsapp.channel !== "whatsapp_oficial") {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex === -1) {
      throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    }
    return sessions[sessionIndex];
  }
};

export const restartWbot = async (
  companyId: number,
  session?: any
): Promise<void> => {
  try {
    const options: FindOptions = {
      where: {
        companyId,
      },
      attributes: ["id"],
    }

    const whatsapp = await Whatsapp.findAll(options);

    whatsapp.map(async c => {
      const sessionIndex = sessions.findIndex(s => s.id === c.id);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].ws.close();
      }

    });

  } catch (err) {
    logger.error(err);
  }
};

export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  clearSessionRefreshTimer(whatsappId);
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex === -1) {
      return;
    }

    const sock = sessions[sessionIndex];
    /** Tirar da lista antes de logout/close — evita travas quando `logout()` do Baileys não resolve. */
    sessions.splice(sessionIndex, 1);

    try {
      sock.ws?.close();
    } catch (err) {
      logger.error(err);
    }

    if (isLogout) {
      try {
        const maybePromise = sock.logout?.();
        if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
          void (maybePromise as Promise<void>).catch(() => {});
        }
      } catch (err) {
        logger.error(err);
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

export function internalIsJidGroup(jid: string): boolean {
  return isJidGroup(jid);
}

export var dataMessages: any = {};

// export const msgDB = msg();

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  try {
    const io = getIO();

    const whatsappUpdate = await Whatsapp.findOne({
      where: { id: whatsapp.id }
    });

    if (!whatsappUpdate) return;

    const { id, name, allowGroup, companyId } = whatsappUpdate;

    logger.info(`Starting session ${name}`);
    let retriesQrCode = 0;

    let wsocket: Session = null;

    const store = new NodeCache({
      stdTTL: 3600, //1 hora
      checkperiod: 30,
      useClones: false
    });

    const msgRetryCounterCache = new NodeCache({
      stdTTL: 60 * 60, // 5 minutes
      useClones: false
    });

    async function getMessage(
      key: WAMessageKey
    ): Promise<WAMessageContent> {
      console.log("key", key);
      if (!key.id) return null;

      const message = store.get(key.id);

      if (message) {
        logger.info({ message }, "cacheMessage: recovered from cache");
        return message;
      }

      logger.info(
        { key },
        "cacheMessage: not found in cache - fallback to database"
      );

      let msg: Message;

      msg = await Message.findOne({
        where: { wid: key.id, fromMe: true }
      });

      if (!msg) {
        logger.info({ key }, "cacheMessage: not found in database");
        return undefined;
      }

      try {
        const data = JSON.parse(msg.dataJson);
        logger.info(
          { key, data },
          "cacheMessage: recovered from database"
        );
        store.set(key.id, data.message);
        return data.message || undefined;
      } catch (error) {
        logger.error(
          { key },
          `cacheMessage: error parsing message from database - ${error.message}`
        );
      }

      return undefined;
    }

    // const { version, isLatest } = await fetchLatestBaileysVersion();
    let versionWA: [number, number, number] = [2, 3000, 1015901307];
    try {
      const { version, isLatest } = await fetchLatestBaileysVersion();
      if (version) {
        versionWA = version;
        console.info(`[WBOT.ts] Using fetched version: ${versionWA.join('.')} (isLatest: ${isLatest})`);
      }
    } catch (err) {
      console.warn(`[WBOT.ts] Failed to fetch latest version, using fallback: ${versionWA.join('.')}`);
    }

    // const versionWA = await getVersionByIndexFromUrl(1);
    // console.info(`[WBOT.ts] Using version: ${versionWA.join('.')} (isLatest: ${isLatest})`);
    
    // Fallback if fetchLatestBaileysVersion fails or returns undefined
    // const versionWA = version || [2, 2413, 1];
    // const versionWA = [2, 3000, 1015901307];
    
    // const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'sessions');
    // const folderSessions = path.join(publicFolder, `company${whatsapp.companyId}`, whatsapp.id.toString());

    // const { state, saveCreds } = await useMultiFileAuthState(folderSessions);
    const { state, saveCreds } = await useMultiFileAuthState(whatsapp);

    wsocket = makeWASocket({
      version: versionWA,
      logger: loggerBaileys,
      printQRInTerminal: true,
      auth: {
        creds: state.creds,
        /** caching makes the store faster to send/recv messages */
        keys: state.keys,
      },
      browser: ["VBSolution", "Chrome", "10.0"],
      syncFullHistory: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      retryRequestDelayMs: 250,
      cachedGroupMetadata: async (jid) => {
        const cachedGroupMetadata = await getGroupMetadataCache(whatsapp.id, jid)

        if (cachedGroupMetadata?.data === 403) {
          throw new AppError("ERR_SENDING_WAPP_MSG_GROUP_BLOCKED")
        }
        return cachedGroupMetadata
      },
      // msgRetryCounterCache,
      // maxMsgRetryCount: 5,
      shouldIgnoreJid: jid => {
        const ignoreJid = (!allowGroup && isJidGroup(jid)) ||
          isJidBroadcast(jid) ||
          isJidNewsletter(jid) ||
          isJidStatusBroadcast(jid)
        // || isJidMetaIa(jid)
        return ignoreJid
      },
      getMessage
    });

    wsocket.id = whatsapp.id;

    wsocket.store = (msg: proto.IWebMessageInfo): void => {
      if (!msg.key.fromMe) return;

      logger.debug({ message: msg.message }, "cacheMessage: saved");

      store.set(msg.key.id, msg.message);
    };

    setTimeout(async () => {
      const wpp = await Whatsapp.findByPk(whatsapp.id);
      // console.log("Status:::::",wpp.status)
      if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
        let dateOldLimit = new Date(wpp.importOldMessages).getTime();
        let dateRecentLimit = new Date(wpp.importRecentMessages).getTime();

        addLogs({
          fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, forceNewFile: true,
          text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${moment().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${moment(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data final da importação: ${moment(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")}
  `})

        const statusImportMessages = new Date().getTime();

        await wpp.update({
          statusImportMessages
        });
        wsocket.ev.on("messaging-history.set", async (messageSet: any) => {
          //if(messageSet.isLatest){

          const statusImportMessages = new Date().getTime();

          await wpp.update({
            statusImportMessages
          });
          const whatsappId = whatsapp.id;
          let filteredMessages = messageSet.messages
          let filteredDateMessages = []
          filteredMessages.forEach(msg => {
            const timestampMsg = Math.floor(msg.messageTimestamp["low"] * 1000)
            if (isValidMsg(msg) && dateOldLimit < timestampMsg && dateRecentLimit > timestampMsg) {
              if (msg.key?.remoteJid.split("@")[1] != "g.us") {
                addLogs({
                  fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}

  `})
                filteredDateMessages.push(msg)
              } else {
                if (wpp?.importOldMessagesGroups) {
                  addLogs({
                    fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${moment(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${getTypeMessage(msg)}

  `})
                  filteredDateMessages.push(msg)
                }
              }
            }

          });


          if (!dataMessages?.[whatsappId]) {
            dataMessages[whatsappId] = [];

            dataMessages[whatsappId].unshift(...filteredDateMessages);
          } else {
            dataMessages[whatsappId].unshift(...filteredDateMessages);
          }

          setTimeout(async () => {
            const wpp = await Whatsapp.findByPk(whatsappId);

            io.of("/" + String(companyId))
              .emit(`importMessages-${wpp.companyId}`, {
                action: "update",
                status: { this: -1, all: -1 }
              });

            io.of("/" + String(companyId))
              .emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: wpp
              });
            //console.log(JSON.stringify(wpp, null, 2));
          }, 500);

          setTimeout(async () => {

            const wpp = await Whatsapp.findByPk(whatsappId);

            if (wpp?.importOldMessages) {
              let isTimeStamp = !isNaN(
                new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime()
              );

              if (isTimeStamp) {
                const ultimoStatus = new Date(
                  Math.floor(parseInt(wpp?.statusImportMessages))
                ).getTime();
                const dataLimite = +add(ultimoStatus, { seconds: +45 }).getTime();

                if (dataLimite < new Date().getTime()) {
                  //console.log("Pronto para come?ar")
                  ImportWhatsAppMessageService(wpp.id)
                  wpp.update({
                    statusImportMessages: "Running"
                  })

                } else {
                  //console.log("Aguardando inicio")
                }
              }
            }
            io.of("/" + String(companyId))
              .emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: wpp
              });
          }, 1000 * 45);

        });
      }

    }, 2500);

    wsocket.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect, qr }) => {
        logger.info(
          `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""
          }`
        );
        
        if (lastDisconnect) {
             console.log(`[WBOT] Disconnect Reason for ${name}:`, JSON.stringify(lastDisconnect, null, 2));
        }

        if (connection === "close") {
          clearSessionRefreshTimer(id);
          console.log("DESCONECTOU", JSON.stringify(lastDisconnect, null, 2))
          logger.info(
            `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""
            }`
          );
          
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

          if (statusCode === 403) {
            await whatsapp.update({ status: "PENDING", session: "" });
            await DeleteBaileysService(whatsapp.id);
            // await deleteFolder(folderSessions);
            await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
            io.of("/" + String(companyId))
              .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                action: "update",
                session: whatsapp
              });
            removeWbot(id, false);
          } else if (statusCode === DisconnectReason.restartRequired || statusCode === 515) {
            // Erro 515 (Stream Errored): Reiniciar sessão automaticamente
            logger.info(`[WBOT] Reiniciando sessão devido a erro 515 (Stream Errored) para ${name}`);
            removeWbot(id, false);
            setTimeout(() => StartWhatsAppSession(whatsapp, whatsapp.companyId), 2000);
          } else if (
            statusCode !== DisconnectReason.loggedOut
          ) {
            if (preventiveRefreshIds.has(id)) {
              logger.info(`[WBOT] Close durante refresh preventivo ${name} — status mantido`);
            } else {
              await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
              io.of("/" + String(companyId))
                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
              removeWbot(id, false);
            }
            // setTimeout(
            //   () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
            //   2000
            // );
          } else {
            await whatsapp.update({ status: "PENDING", session: "" });
            await DeleteBaileysService(whatsapp.id);
            // await deleteFolder(folderSessions);
            await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
            io.of(String(companyId))
              .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                action: "update",
                session: whatsapp
              });
            removeWbot(id, false);
            // setTimeout(
            //   () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
            //   2000
            // );
          }
        }

        if (connection === "open") {

          wsocket.myLid = jidNormalizedUser(wsocket.user?.lid)
          wsocket.myJid = jidNormalizedUser(wsocket.user.id)

          await whatsapp.update({
            status: "CONNECTED",
            qrcode: "",
            retries: 0,
            number:
              wsocket.type === "md"
                ? jidNormalizedUser((wsocket as WASocket).user.id).split("@")[0]
                : "-"
          });

          io.of("/" + String(companyId))
            .emit(`company-${companyId}-whatsappSession`, {
              action: "update",
              session: whatsapp
            });

          logger.debug(
            {
              id: jidNormalizedUser(wsocket.user.id),
              name: wsocket.user.name,
              lid: jidNormalizedUser(wsocket.user?.lid),
              notify: wsocket.user?.notify,
              verifiedName: wsocket.user?.verifiedName,
              imgUrl: wsocket.user?.imgUrl,
              status: wsocket.user?.status
            },
            `Session ${name} details`
          );

          // Buscar grupos e salvar no cache
          try {
            const groups = await wsocket.groupFetchAllParticipating();
            if (groups && typeof groups === 'object') {
              for (const [id, groupMetadata] of Object.entries(groups)) {
                await redisGroupCache.del(whatsapp.id, id);
                await redisGroupCache.set(whatsapp.id, id, groupMetadata);
              }
            }
          } catch (groupErr) {
            logger.warn(`[wbot] Erro ao buscar grupos para whatsapp ${whatsapp.id}: ${groupErr}`);
          }

          const sessionIndex = sessions.findIndex(
            s => s.id === whatsapp.id
          );
          if (sessionIndex === -1) {
            wsocket.id = whatsapp.id;
            sessions.push(wsocket);
          }

          scheduleSessionKeepAlive(whatsapp);
        }

        if (qr !== undefined) {
          if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
            await whatsappUpdate.update({
              status: "DISCONNECTED",
              qrcode: ""
            });
            await DeleteBaileysService(whatsappUpdate.id);
            // await deleteFolder(folderSessions);
            await cacheLayer.delFromPattern(`sessions:${whatsapp.id}:*`);
            io.of("/" + String(companyId))
              .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                action: "update",
                session: whatsappUpdate
              });
            wsocket.ev.removeAllListeners("connection.update");
            wsocket.ws.close();
            wsocket = null;
            retriesQrCodeMap.delete(id);
          } else {
            logger.info(`Session QRCode Generate ${name}`);
            retriesQrCodeMap.set(id, (retriesQrCode += 1));

            console.log(`[WBOT] Emitting QRCode for company ${companyId} - Session ${whatsapp.id} - QR Length: ${qr.length}`);
            io.of("/" + String(companyId))
              .emit(`company-${companyId}-whatsappSession`, {
                action: "update",
                session: { ...whatsapp.toJSON(), qrcode: qr, status: "qrcode", retries: 0 }
              });

            await whatsapp.update({
              qrcode: qr,
              status: "qrcode",
              retries: 0,
              number: ""
            });
            const sessionIndex = sessions.findIndex(
              s => s.id === whatsapp.id
            );

            if (sessionIndex === -1) {
              wsocket.id = whatsapp.id;
              sessions.push(wsocket);
            }
          }
        }
      }
    );
    wsocket.ev.on("creds.update", saveCreds);
    // wsocket.store = store;
    // store.bind(wsocket.ev);

    return wsocket;
  } catch (error) {
    Sentry.captureException(error);
    console.log(error);
    throw error;
  }
};
