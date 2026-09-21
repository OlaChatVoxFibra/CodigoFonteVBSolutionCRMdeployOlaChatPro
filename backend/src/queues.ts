/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { clearCampaignTicketAgentFlags } from "./helpers/ticketAiAgentPreview";
import * as Sentry from "@sentry/node";
import BullQueue from "bull";
import { MessageData, SendMessage } from "./helpers/SendMessage";
import Whatsapp from "./models/Whatsapp";
import { Mutex } from "async-mutex";
import logger from "./utils/logger";
import moment from "moment";
import Schedule from "./models/Schedule";
import { Op, QueryTypes } from "sequelize";
import GetDefaultWhatsApp from "./helpers/GetDefaultWhatsApp";
import Campaign from "./models/Campaign";
import Queues from "./models/Queue";
import ContactList from "./models/ContactList";
import ContactListItem from "./models/ContactListItem";
import { isEmpty, isNil, isArray } from "lodash";
import CampaignSetting from "./models/CampaignSetting";
import CampaignShipping from "./models/CampaignShipping";
import GetWhatsappWbot from "./helpers/GetWhatsappWbot";
import sequelize from "./database";
import { getMessageOptions } from "./services/WbotServices/SendWhatsAppMedia";
import { getIO } from "./libs/socket";
import path from "path";
import User from "./models/User";
import Company from "./models/Company";
import Contact from "./models/Contact";
import Queue from "./models/Queue";
import { ClosedAllOpenTickets } from "./services/WbotServices/wbotClosedTickets";
import Ticket from "./models/Ticket";
import UserQueue from "./models/UserQueue";
import ContactWallet from "./models/ContactWallet";
import ShowTicketService from "./services/TicketServices/ShowTicketService";
import SendWhatsAppMessage from "./services/WbotServices/SendWhatsAppMessage";
import SendWhatsAppMedia from "./services/WbotServices/SendWhatsAppMedia";
import UpdateTicketService from "./services/TicketServices/UpdateTicketService";
import { addSeconds, differenceInSeconds } from "date-fns";
const CronJob = require("cron").CronJob;
import CompaniesSettings from "./models/CompaniesSettings";
import {
  verifyMediaMessage,
  verifyMessage
} from "./services/WbotServices/wbotMessageListener";
import CreateLogTicketService from "./services/TicketServices/CreateLogTicketService";
import formatBody from "./helpers/Mustache";
import TicketTag from "./models/TicketTag";
import Tag from "./models/Tag";
import ContactTag from "./models/ContactTag";
import Plan from "./models/Plan";
import { getWbot } from "./libs/wbot";
import { initializeBirthdayJobs } from "./jobs/BirthdayJob";
import { initializeAgentProactiveJobs } from "./jobs/AgentProactiveJobs";
import { handleAgentProactiveSequenceJob } from "./services/AgentProactiveServices/proactiveSequenceQueue";
import { getJidOf } from "./services/WbotServices/getJidOf";
import RecurrenceService from "./services/CampaignService/RecurrenceService";
import WhatsappLidMap from "./models/WhatsapplidMap";
import { checkAndDedup } from "./services/WbotServices/verifyContact";
import SendWhatsAppOficialMessage from "./services/WhatsAppOficial/SendWhatsAppOficialMessage";
import { obterNomeEExtensaoDoArquivo } from "./controllers/MessageController";
import MessageApi from "./models/MessageApi";
import CheckContactNumber from "./services/WbotServices/CheckNumber";
import { runSmsCampaignDispatch } from "./services/SmsServices/dispatchSmsCampaignMessage";
import { runWhatsAppOficialCampaignDispatch } from "./services/WhatsAppOficial/dispatchWhatsAppOficialCampaignMessage";
import { runTelegramCampaignDispatch } from "./services/TelegramServices/dispatchTelegramCampaignMessage";
import CreateOrUpdateContactService from "./services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "./services/TicketServices/FindOrCreateTicketService";
import fs from "fs";
import SendWhatsAppMessageAPI from "./services/WbotServices/SendWhatsAppMessageAPI";
import delay from "./utils/delay";
import { REDIS_OPT_LIMITER_DURATION, REDIS_OPT_LIMITER_MAX, REDIS_URI_CONNECTION } from "./config/redis";
const connection = REDIS_URI_CONNECTION;
const limiterMax = REDIS_OPT_LIMITER_MAX;
const limiterDuration = REDIS_OPT_LIMITER_DURATION;

function createQueue(name: string, options?: any) {
  if (!connection || String(connection).trim() === "") {
    return null as any;
  }
  try {
    const queue = new BullQueue(name, connection, options);
    let loggedError = false;
    queue.on('error', (error) => {
      if (!loggedError) {
        logger.warn(`[Queue ${name}] Erro na conexão (ignorado para desenvolvimento): ${error.message}`);
        loggedError = true;
      }
    });
    return queue;
  } catch (error) {
    logger.warn(`[Queue ${name}] Não foi possível criar fila (desenvolvimento local)`);
    return null as any;
  }
}

interface ProcessCampaignData {
  id: number;
  /** Legado: delay vinha no payload; o correto é usar opções do Bull (`opts.delay`). */
  delay?: number;
  restartMode?: boolean;
  messageInterval?: number;
  longerIntervalAfter?: number;
  greaterInterval?: number;
}

/** Normaliza telefone para comparar entregues x lista (evita falha no reinício por formato diferente). */
function normalizeCampaignPhoneDigits(raw: string | null | undefined): string {
  if (raw == null) return "";
  return String(raw).replace(/\D/g, "");
}

interface CampaignSettings {
  messageInterval: number;
  longerIntervalAfter: number;
  greaterInterval: number;
  variables: any[];
}

interface PrepareContactData {
  contactId: number;
  campaignId: number;
  variables: any[];
}

interface DispatchCampaignData {
  campaignId: number;
  campaignShippingId: number;
  contactListItemId: number;
}

interface LidRetryData {
  contactId: number;
  whatsappId: number;
  companyId: number;
  number: string;
  retryCount: number;
  maxRetries?: number;
}

export const userMonitor = createQueue("UserMonitor");
export const scheduleMonitor = createQueue("ScheduleMonitor");
export const sendScheduledMessages = createQueue("SendSacheduledMessages");
export const campaignQueue = createQueue("CampaignQueue");
export const queueMonitor = createQueue("QueueMonitor");
export const lidRetryQueue = createQueue("LidRetryQueue");
export const agentInboundQueue = createQueue("AgentInboundQueue");

export const messageQueue = createQueue("MessageQueue", {
  limiter: {
    max: limiterMax as number,
    duration: limiterDuration as number
  }
});

let isProcessing = false;
let messageApisTableReady: boolean | null = null;
let messageApisLastCheckAt = 0;

async function ensureMessageApisTableReady(): Promise<boolean> {
  const now = Date.now();
  if (messageApisTableReady !== null && now - messageApisLastCheckAt < 60000) {
    return messageApisTableReady;
  }
  messageApisLastCheckAt = now;
  try {
    const rows = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'MessageApis'
       ) AS "exists"`,
      { type: QueryTypes.SELECT }
    );
    messageApisTableReady = !!rows?.[0]?.exists;
    if (!messageApisTableReady) {
      logger.warn("[MessageApiQueue] Tabela MessageApis ainda não existe; aguardando migrations.");
    }
    return messageApisTableReady;
  } catch (error: any) {
    messageApisTableReady = false;
    logger.warn(`[MessageApiQueue] Não foi possível verificar MessageApis: ${error?.message || error}`);
    return false;
  }
}

async function apiMessageQueue() {
  try {
    if (!(await ensureMessageApisTableReady())) return;
    const currentDate = new Date();
    const mutex = new Mutex();
    let quotedMsg;
    let msdelay = 0;

    //logger.info('Iniciando processamento de mensagens na fila...');

    const companies = await Company.findAll({
      attributes: ['id', 'name'],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "channel"],
          where: {
            status: 'CONNECTED'
          }
        },
      ]
    });

    //logger.info(`Encontradas ${companies.length} empresas ativas`);

    // Usar Promise.all para melhor desempenho e captura de erros
    await Promise.all(companies.map(async company => {
      try {
        //logger.info(`Processando empresa ${company.id} - ${company.name}`);

        await Promise.all(company.whatsapps.map(async whatsapp => {
          // Ignorar conexões WhatsApp Oficial (usam webhook, não polling)
          if (whatsapp.channel === "whatsapp_oficial") return;
          try {
            //logger.info(`Processando whatsapp ${whatsapp.id} da empresa ${company.id}`);

            const pendingMessages = await MessageApi.findAll({
              where: {
                isSending: false,
                companyId: company.id,
                whatsappId: whatsapp.id,
                error: null, // Ignorar mensagens com erro
                [Op.or]: [
                  { schedule: { [Op.lte]: currentDate } },
                  { schedule: null }
                ]
              },
              order: [['schedule', 'ASC']]
            });

            if (!pendingMessages?.length) {
              //logger.info(`Nenhuma mensagem pendente para whatsapp ${whatsapp.id}`);
              return;
            }

            //logger.info(`Encontradas ${pendingMessages.length} mensagens pendentes para whatsapp ${whatsapp.id}`);

            const companyId = company.id;
            const whatsappId = whatsapp.id;

            let wbot;



            const settings = await CompaniesSettings.findOne({
              where: { companyId }
            });

            for (const [index, message] of pendingMessages.entries()) {
              try {
                const conexao = await Whatsapp.findByPk(message.whatsappId);

                if(conexao.channel === 'whatsapp_oficial') {
                  wbot = await getWbot(conexao.id);
                } else {
                  wbot = await getWbot(whatsapp.id);
                }

                const CheckValidNumber = await CheckContactNumber(message.number, message.companyId);
                const validNumber = CheckValidNumber.jid.split("@")[0];

                const contactData = {
                  name: `${validNumber}`,
                  number: validNumber,
                  profilePicUrl: "",
                  isGroup: false,
                  companyId,
                  whatsappId,
                  remoteJid: validNumber.length > 17 ? `${validNumber}@g.us` : `${validNumber}@s.whatsapp.net`,
                  wbot
                };

                const contact = await CreateOrUpdateContactService(contactData);

                const createTicket = await FindOrCreateTicketService(
                  contact,
                  whatsapp,
                  0,
                  companyId,
                  message.queueId,
                  message.userId,
                  null,
                  whatsapp.channel,
                  null,
                  false,
                  settings,
                  false,
                  false
                );

                const whatsappInstance = await Whatsapp.findByPk(conexao.id);
                if (!whatsappInstance) {
                  logger.error(`Whatsapp não encontrado para o ID: ${whatsapp.id}`);
                  continue;
                }

                let sentMessage;
                if (message.mediaType) {
                  try {
                    //logger.info(`Preparando mídia para mensagem ${message.id}`);

                    let fileBuffer = Buffer.from('');
                    if (message.path) {
                      if (fs.existsSync(message.path)) {
                        fileBuffer = await fs.promises.readFile(message.path);
                      } else {
                        logger.warn(`Arquivo de mídia não encontrado: ${message.path}`);
                      }
                    }

                    const mediaFile: Express.Multer.File = {
                      fieldname: 'media',
                      originalname: message.originalName || 'file',
                      encoding: '7bit',
                      mimetype: message.mimeType || 'application/octet-stream',
                      size: parseInt(message.size?.toString() || '0', 10),
                      destination: message.destination || '',
                      filename: message.filename || '',
                      path: message.path || '',
                      buffer: fileBuffer,
                      stream: null
                    };

                    if(whatsappInstance.channel === 'whatsapp_oficial') {
                      await SendWhatsAppOficialMessage({
                        body: `${message.body}`,
                        ticket: createTicket,
                        quotedMsg: null,
                        type: undefined,
                        media: mediaFile,
                        vCard: null
                      });
                    } else {
                      sentMessage = await SendWhatsAppMedia({
                        body: `${message.body}`,
                        media: mediaFile,
                        ticket: createTicket,
                        isForwarded: false
                      });

                      await verifyMediaMessage(sentMessage, createTicket, createTicket.contact, null, false, false, wbot);

                    }
                    if (fs.existsSync(message.path)) {
                      fs.unlinkSync(message.path);
                    }
                  } catch (mediaError) {
                    logger.error(`Erro ao processar mídia da mensagem ${message.id}:`, {
                      error: mediaError,
                      message: mediaError.message,
                      stack: mediaError.stack
                    });
                    throw mediaError;
                  }
                } else {
                  if(whatsappInstance.channel === 'whatsapp_oficial') {
                    await SendWhatsAppOficialMessage({
                      body: `${message.body}`,
                      ticket: createTicket,
                      quotedMsg,
                      type: 'text',
                      media: null,
                      vCard: null
                    });
                  } else {
                    sentMessage = await SendWhatsAppMessageAPI({
                      body: `${message.body}`,
                      whatsappId: whatsapp.id,
                      contact: createTicket.contact,
                      quotedMsg,
                      msdelay
                    });
                    await verifyMessage(sentMessage, createTicket, createTicket.contact);
                  }

                }

                //console.log(`Tickett ${createTicket.id} enviado para o contato ${createTicket.contact.name} (${createTicket.contact.number})`);

                await MessageApi.update({
                  isSending: true,
                  sentAt: new Date(),
                  ticketId: createTicket.id
                }, {
                  where: { id: message.id }
                });

                if (message.closeTicket === true) {
                  //logger.info(`Ticket ${createTicket.id} aberto após envio da mensagem ${message.id}`);
                  setTimeout(async () => {
                    await Ticket.update({
                      status: "closed",
                      sendFarewellMessage: false,
                      amountUsedBotQueues: 0,
                      lastMessage: message.body
                    }, {
                      where: { id: createTicket.id, companyId: companyId }
                    });
                    //logger.info(`Ticket ${createTicket.id} fechado após envio da mensagem ${message.id}`);

                  }, 1000);

                }

                if (pendingMessages.length > 1 && index < pendingMessages.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }

              } catch (messageError) {
                // Marca mensagem como erro para evitar loop infinito
                logger.error(`[DEBUG 2026] Marcando mensagem ${message.id} como erro para evitar loop. Erro: ${messageError.message}`);
                await MessageApi.update({ error: messageError.message, isSending: false }, { where: { id: message.id } });

                logger.error(`Erro ao processar mensagem ${message?.id}:`, {
                  error: messageError,
                  message: messageError.message,
                  stack: messageError.stack,
                  messageData: message?.get ? message.get({ plain: true }) : message
                });
              }
            }
          } catch (whatsappError) {
            // logger.error(`Erro ao processar whatsapp ${whatsapp?.id}:`, {
            //   error: whatsappError,
            //   message: whatsappError.message,
            //   stack: whatsappError.stack
            // });
          }
        }));
      } catch (companyError) {
        logger.error(`Erro ao processar empresa ${company?.id}:`, {
          error: companyError,
          message: companyError.message,
          stack: companyError.stack
        });
      }
    }));
  } catch (globalError) {
    logger.error("Erro global no MessageAPI:", {
      error: globalError,
      message: globalError.message,
      stack: globalError.stack
    });
  }
}

async function workerContinuo() {
  while (true) {
    try {
      await apiMessageQueue(); // Processa tudo
      await delay(5000); // Você pode ajustar esse tempo, ex: 2 segundos entre os ciclos
    } catch (error) {
      console.error('Erro no processamento:', error);
      await delay(5000); // Espera 5 segundos antes de tentar novamente em caso de erro
    }
  }
}



async function handleSendMessage(job) {
  try {
    const { data } = job;

    const whatsapp = await Whatsapp.findByPk(data.whatsappId);

    if (whatsapp === null) {
      throw Error("Whatsapp não identificado");
    }

    const messageData: MessageData = data.data;

    console.log('messageData', messageData);
    await SendMessage(whatsapp, messageData);
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessage: error", e.message);
    throw e;
  }
}

// ✅ Nova função para verificar lembretes
async function handleVerifyReminders(job) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        reminderStatus: "PENDENTE",
        reminderSentAt: null,
        reminderDate: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [
        { model: Contact, as: "contact" },
        { model: User, as: "user", attributes: ["name"] }
      ],
      distinct: true,
      subQuery: false
    });

    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          reminderStatus: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendReminder",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`Lembrete agendado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendReminder -> Verify: error", e.message);
    throw e;
  }
}

async function handleVerifySchedules(job) {
  try {
    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where: {
        status: "PENDENTE",
        sentAt: null,
        sendAt: {
          [Op.gte]: moment().format("YYYY-MM-DD HH:mm:ss"),
          [Op.lte]: moment().add("30", "seconds").format("YYYY-MM-DD HH:mm:ss")
        }
      },
      include: [
        { model: Contact, as: "contact" },
        { model: User, as: "user", attributes: ["name"] }
      ],
      distinct: true,
      subQuery: false
    });

    if (count > 0) {
      schedules.map(async schedule => {
        await schedule.update({
          status: "AGENDADA"
        });
        sendScheduledMessages.add(
          "SendMessage",
          { schedule },
          { delay: 40000 }
        );
        logger.info(`Disparo agendado para: ${schedule.contact.name}`);
      });
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SendScheduledMessage -> Verify: error", e.message);
    throw e;
  }
}

async function handleSendScheduledMessage(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  try {
    // ✅ Verificar se há lembrete configurado
    if (schedule.reminderDate && schedule.reminderStatus === "PENDENTE") {
      logger.info(`Agendamento ${schedule.id} tem lembrete configurado - não enviando mensagem no horário original`);

      // Atualizar status para indicar que não será enviado no horário original
      await scheduleRecord?.update({
        status: "CANCELADO_POR_LEMBRETE"
      });

      return; // Não enviar a mensagem no horário original
    }

    let whatsapp;

    if (!isNil(schedule.whatsappId)) {
      whatsapp = await Whatsapp.findByPk(schedule.whatsappId);
    }

    if (!whatsapp) whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    // const settings = await CompaniesSettings.findOne({
    //   where: {
    //     companyId: schedule.companyId
    //   }
    // })

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve(
        "public",
        `company${schedule.companyId}`,
        schedule.mediaPath
      );
    }

    if (schedule.openTicket === "enabled") {
      let ticket = await Ticket.findOne({
        where: {
          contactId: schedule.contact.id,
          companyId: schedule.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket)
        ticket = await Ticket.create({
          companyId: schedule.companyId,
          contactId: schedule.contactId,
          whatsappId: whatsapp.id,
          queueId: schedule.queueId,
          userId: schedule.ticketUserId,
          status: schedule.statusTicket
        });

      ticket = await ShowTicketService(ticket.id, schedule.companyId);

      let bodyMessage;

      // @ts-ignore: Unreachable code error
      if (schedule.assinar && !isNil(schedule.userId)) {
        bodyMessage = `*${schedule?.user?.name}:*\n${schedule.body.trim()}`;
      } else {
        bodyMessage = schedule.body.trim();
      }

      const dataAgendamento = await agendamentoContato(schedule);
      let bodySchedule = bodyMessage.replace("{{dataAgendamento}}", dataAgendamento);
      bodySchedule = `${formatBody(bodySchedule, ticket)}`;

      const sentMessage = await SendMessage(
        whatsapp,
        {
          number: schedule.contact.number,
          body: bodySchedule,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
        schedule.contact.isGroup
      );

      if (schedule.mediaPath) {
        await verifyMediaMessage(
          sentMessage,
          ticket,
          ticket.contact,
          null,
          true,
          false,
          whatsapp
        );
      } else {
        await verifyMessage(
          sentMessage,
          ticket,
          ticket.contact,
          null,
          true,
          false
        );
      }
      // if (ticket) {
      //   await UpdateTicketService({
      //     ticketData: {
      //       sendFarewellMessage: false,
      //       status: schedule.statusTicket,
      //       userId: schedule.ticketUserId || null,
      //       queueId: schedule.queueId || null
      //     },
      //     ticketId: ticket.id,
      //     companyId: ticket.companyId
      //   })
      // }
    } else {

      const dataAgendamento = await agendamentoContato(schedule);
      let bodySchedule = schedule.body.replace("{{dataAgendamento}}", dataAgendamento);
      bodySchedule = `${formatBody(bodySchedule, null)}`;

      await SendMessage(
        whatsapp,
        {
          number: schedule.contact.number,
          body: bodySchedule,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
        schedule.contact.isGroup
      );
    }

    if (
      schedule.valorIntervalo > 0 &&
      (isNil(schedule.contadorEnvio) ||
        schedule.contadorEnvio < schedule.enviarQuantasVezes)
    ) {
      let unidadeIntervalo;
      switch (schedule.intervalo) {
        case 1:
          unidadeIntervalo = "days";
          break;
        case 2:
          unidadeIntervalo = "weeks";
          break;
        case 3:
          unidadeIntervalo = "months";
          break;
        case 4:
          unidadeIntervalo = "minuts";
          break;
        default:
          throw new Error("Intervalo inválido");
      }

      function isDiaUtil(date) {
        const dayOfWeek = date.day();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 é segunda-feira, 5 é sexta-feira
      }

      function proximoDiaUtil(date) {
        let proximoDia = date.clone();
        do {
          proximoDia.add(1, "day");
        } while (!isDiaUtil(proximoDia));
        return proximoDia;
      }

      // Função para encontrar o dia útil anterior
      function diaUtilAnterior(date) {
        let diaAnterior = date.clone();
        do {
          diaAnterior.subtract(1, "day");
        } while (!isDiaUtil(diaAnterior));
        return diaAnterior;
      }

      const dataExistente = new Date(schedule.sendAt);
      const hora = dataExistente.getHours();
      const fusoHorario = dataExistente.getTimezoneOffset();

      // Realizar a soma da data com base no intervalo e valor do intervalo
      let novaData = new Date(dataExistente); // Clone da data existente para não modificar a original

      if (unidadeIntervalo !== "minuts") {
        novaData.setDate(
          novaData.getDate() +
          schedule.valorIntervalo *
          (unidadeIntervalo === "days"
            ? 1
            : unidadeIntervalo === "weeks"
              ? 7
              : 30)
        );
      } else {
        novaData.setMinutes(
          novaData.getMinutes() + Number(schedule.valorIntervalo)
        );
      }

      if (schedule.tipoDias === 5 && !isDiaUtil(novaData)) {
        novaData = diaUtilAnterior(novaData);
      } else if (schedule.tipoDias === 6 && !isDiaUtil(novaData)) {
        novaData = proximoDiaUtil(novaData);
      }

      novaData.setHours(hora);
      novaData.setMinutes(novaData.getMinutes() - fusoHorario);

      await scheduleRecord?.update({
        status: "PENDENTE",
        contadorEnvio: schedule.contadorEnvio + 1,
        sendAt: new Date(novaData.toISOString().slice(0, 19).replace("T", " ")) // Mantendo o formato de hora
      });
    } else {
      await scheduleRecord?.update({
        sentAt: new Date(moment().format("YYYY-MM-DD HH:mm")),
        status: "ENVIADA"
      });
    }
    logger.info(`Mensagem agendada enviada para: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      status: "ERRO"
    });
    logger.error("SendScheduledMessage -> SendMessage: error", e.message);
    throw e;
  }
}

// Função para buscar o agendamento de um contato e retornar a data/hora no formato brasileiro
export const agendamentoContato = async (schedule: Schedule): Promise<string> => {
  try {
    const sendAt = schedule?.sendAt;
    if (!sendAt) return null;

    // Cria um objeto Date a partir do sendAt
    const dateObj = new Date(sendAt);

    // Converte para o fuso horário de Brasília (UTC-3)
    const brasiliaDate = new Date(dateObj.getTime() - (3 * 60 * 60 * 1000));

    // Extrai os componentes da data de Brasília
    const dia = String(brasiliaDate.getUTCDate()).padStart(2, '0');
    const mes = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
    const ano = brasiliaDate.getUTCFullYear();
    const hora = String(brasiliaDate.getUTCHours()).padStart(2, '0');
    const minuto = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${ano} às ${hora}:${minuto}hs`;
  } catch (error) {
    console.error("Erro ao buscar agendamento do contato:", error);
    return null;
  }
};


// ✅ Nova função para enviar lembretes
async function handleSendReminder(job) {
  const {
    data: { schedule }
  } = job;
  let scheduleRecord: Schedule | null = null;

  try {
    scheduleRecord = await Schedule.findByPk(schedule.id);
  } catch (e) {
    Sentry.captureException(e);
    logger.info(`Erro ao tentar consultar agendamento: ${schedule.id}`);
  }

  try {
    let whatsapp;

    if (!isNil(schedule.whatsappId)) {
      whatsapp = await Whatsapp.findByPk(schedule.whatsappId);
    }

    if (!whatsapp) whatsapp = await GetDefaultWhatsApp(schedule.companyId);

    let filePath = null;
    if (schedule.mediaPath) {
      filePath = path.resolve(
        "public",
        `company${schedule.companyId}`,
        schedule.mediaPath
      );
    }

    if (schedule.openTicket === "enabled") {

      let ticket = await Ticket.findOne({
        where: {
          contactId: schedule.contact.id,
          companyId: schedule.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket)
        ticket = await Ticket.create({
          companyId: schedule.companyId,
          contactId: schedule.contactId,
          whatsappId: whatsapp.id,
          queueId: schedule.queueId,
          userId: schedule.ticketUserId,
          status: schedule.statusTicket
        });

      ticket = await ShowTicketService(ticket.id, schedule.companyId);

      let bodyMessage;

      // @ts-ignore: Unreachable code error
      if (schedule.assinar && !isNil(schedule.userId)) {
        bodyMessage = `*${schedule?.user?.name}:*\n${schedule.body.trim()}`;
      } else {
        bodyMessage = schedule.body.trim();
      }

      const dataAgendamento = await agendamentoContato(schedule);
      let bodySchedule = bodyMessage.replace("{{dataAgendamento}}", dataAgendamento);
      bodySchedule = `${formatBody(bodySchedule, ticket)}`;

      const sentMessage = await SendMessage(
        whatsapp,
        {
          number: schedule.contact.number,
          body: bodySchedule,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
        schedule.contact.isGroup
      );

      if (schedule.mediaPath) {
        await verifyMediaMessage(
          sentMessage,
          ticket,
          ticket.contact,
          null,
          true,
          false,
          whatsapp
        );
      } else {
        await verifyMessage(
          sentMessage,
          ticket,
          ticket.contact,
          null,
          true,
          false
        );
      }
      // if (ticket) {
      //   await UpdateTicketService({
      //     ticketData: {
      //       sendFarewellMessage: false,
      //       status: schedule.statusTicket,
      //       userId: schedule.ticketUserId || null,
      //       queueId: schedule.queueId || null
      //     },
      //     ticketId: ticket.id,
      //     companyId: ticket.companyId
      //   })
      // }
    } else {

      const dataAgendamento = await agendamentoContato(schedule);
      let bodySchedule = schedule.body.replace("{{dataAgendamento}}", dataAgendamento);
      bodySchedule = `${formatBody(bodySchedule, null)}`;

      await SendMessage(
        whatsapp,
        {
          number: schedule.contact.number,
          body: bodySchedule,
          mediaPath: filePath,
          companyId: schedule.companyId
        },
        schedule.contact.isGroup
      );
    }

    // Atualizar status do lembrete
    await scheduleRecord?.update({
      reminderSentAt: new Date(moment().format("YYYY-MM-DD HH:mm")),
      reminderStatus: "ENVIADA"
    });

    logger.info(`Lembrete enviado para: ${schedule.contact.name}`);
    sendScheduledMessages.clean(15000, "completed");
  } catch (e: any) {
    Sentry.captureException(e);
    await scheduleRecord?.update({
      reminderStatus: "ERRO"
    });
    logger.error("SendReminder -> SendMessage: error", e.message);
    throw e;
  }
}

async function handleVerifyCampaigns(job) {
  if (isProcessing) {
    return;
  }
  isProcessing = true;
  try {
    await new Promise(r => setTimeout(r, 1500));
    const campaigns: { id: number; scheduledAt: string; nextScheduledAt: string }[] =
      await sequelize.query(
        `SELECT id, "scheduledAt", "nextScheduledAt"
         FROM "Campaigns" c
         WHERE (
           ("scheduledAt" <= NOW() + INTERVAL '1 minute' AND status = 'PROGRAMADA' AND "executionCount" = 0)
           OR
           ("nextScheduledAt" <= NOW() + INTERVAL '1 minute' AND status IN ('PROGRAMADA', 'EM_ANDAMENTO') AND "isRecurring" = true)
         )`,
        { type: QueryTypes.SELECT }
      );

    if (campaigns.length > 0) {
      logger.info(`Campanhas encontradas: ${campaigns.length}`);

      const promises = campaigns.map(async campaign => {
        try {
          const result = await sequelize.query(
            `UPDATE "Campaigns" SET status = 'EM_ANDAMENTO'
             WHERE id = ${campaign.id} AND status IN ('PROGRAMADA', 'EM_ANDAMENTO')
             RETURNING id`,
            { type: QueryTypes.SELECT }
          );

          if (!result || result.length === 0) {
            logger.info(`Campanha ${campaign.id} não está mais disponível para processamento`);
            return null;
          }

          const now = moment();
          const executeAt = campaign.nextScheduledAt || campaign.scheduledAt;
          const scheduledAt = moment(executeAt);
          const delay = Math.max(0, scheduledAt.diff(now, "milliseconds"));

          logger.info(
            `Campanha enviada para a fila: Campanha=${campaign.id}, Delay=${delay}ms`
          );

          // Se o delay for muito pequeno (menos de 1 segundo), executar imediatamente
          if (delay < 1000) {
            logger.info(`Campanha ${campaign.id} deve executar imediatamente (delay muito pequeno)`);
            return campaignQueue.add(
              "ProcessCampaign",
              { id: campaign.id },
              {
                priority: 3,
                removeOnComplete: { age: 60 * 60, count: 10 },
                removeOnFail: { age: 60 * 60, count: 10 }
              }
            );
          }

          // Para delays maiores, usar delay na opção do job
          return campaignQueue.add(
            "ProcessCampaign",
            { id: campaign.id },
            {
              priority: 3,
              delay: delay,
              removeOnComplete: { age: 60 * 60, count: 10 },
              removeOnFail: { age: 60 * 60, count: 10 }
            }
          );
        } catch (err) {
          Sentry.captureException(err);
        }
      });

      const validPromises = (await Promise.all(promises)).filter(p => p !== null);
      logger.info(`${validPromises.length} campanhas processadas efetivamente`);
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error processing campaigns: ${err.message}`);
  } finally {
    isProcessing = false;
  }
}

async function getCampaign(id) {
  const campaign = await Campaign.findOne({
    where: { id },
    include: [
      {
        model: ContactList,
        as: "contactList",
        attributes: ["id", "name"],
        required: false, // LEFT JOIN para campanhas que podem usar tags
        include: [
          {
            model: ContactListItem,
            as: "contacts",
            attributes: [
              "id",
              "name",
              "number",
              "email",
              "isWhatsappValid",
              "isGroup"
            ],
            // Não filtrar por isWhatsappValid: itens criados no "Enviar agora" podem ficar false
            // se CheckContactNumber falhar na hora, e a campanha acabaria com 0 destinatários.
            required: false
          }
        ]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "channel", "status", "number", "token", "facebookUserId"]
      }
    ]
  });

  if (!campaign) {
    return null;
  }

  // Se a campanha usa tagListId em vez de contactListId, buscar contatos por tag
  if (campaign.tagListId && !campaign.contactListId) {
    logger.info(`[TAG-DEBUG] Buscando contatos por tagId: ${campaign.tagListId} para campanha: ${id}, companyId: ${campaign.companyId}`);

    // Primeiro, vamos verificar quais contatos realmente têm essa tag
    const contactTags = await ContactTag.findAll({
      where: { tagId: campaign.tagListId },
      attributes: ["contactId", "tagId"],
      include: [
        {
          model: Contact,
          as: "contact",
          attributes: ["id", "name", "number", "companyId", "active"]
        }
      ]
    });

    logger.info(`[TAG-DEBUG] ContactTags encontrados para tagId ${campaign.tagListId}:`, contactTags.map(ct => ({
      contactId: ct.contactId,
      tagId: ct.tagId,
      contactName: ct.contact?.name,
      contactNumber: ct.contact?.number,
      contactCompanyId: ct.contact?.companyId,
      contactActive: ct.contact?.active
    })));

    // Buscar contatos usando uma abordagem mais robusta
    const contactIds = await ContactTag.findAll({
      where: { tagId: campaign.tagListId },
      attributes: ["contactId"]
    });

    const contactIdList = contactIds.map(ct => ct.contactId);
    logger.info(`[TAG-DEBUG] ContactIds encontrados para tagId ${campaign.tagListId}:`, contactIdList);

    const contacts = await Contact.findAll({
      attributes: [
        "id",
        "name",
        "number",
        "email",
        "isGroup"
      ],
      where: {
        id: { [Op.in]: contactIdList },
        companyId: campaign.companyId,
        active: true // Apenas contatos ativos
      }
    });

    logger.info(`[TAG-DEBUG] Contatos encontrados via Contact.findAll:`, contacts.map(c => ({
      id: c.id,
      name: c.name,
      number: c.number,
      companyId: c.companyId
    })));

    // Verificação adicional: confirmar que os contatos realmente têm a tag correta
    for (const contact of contacts) {
      const contactTags = await ContactTag.findAll({
        where: { contactId: contact.id },
        attributes: ["tagId"]
      });

      const tagIds = contactTags.map(ct => ct.tagId);
      logger.info(`[TAG-DEBUG] Contato ${contact.id} (${contact.name}) tem as tags:`, tagIds);

      if (!tagIds.includes(Number(campaign.tagListId))) {
        logger.error(`[TAG-DEBUG] ERRO: Contato ${contact.id} (${contact.name}) não deveria estar na tag ${campaign.tagListId}!`);
      }
    }

    logger.info(`[TAG-DEBUG] Total de ${contacts.length} contatos encontrados para tag ${campaign.tagListId}`);

    // Estruturar os dados no mesmo formato que ContactListItem para compatibilidade
    const formattedContacts = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      number: contact.number,
      email: contact.email,
      isWhatsappValid: true, // Assumir válido se está na lista de contatos
      isGroup: contact.isGroup || false
    }));

    // Criar uma estrutura similar à contactList para compatibilidade
    // Usando any para contornar a tipagem rígida do Sequelize
    (campaign as any).contactList = {
      id: null,
      name: `Tag ${campaign.tagListId}`,
      contacts: formattedContacts
    };
  }

  return campaign;
}

async function getContact(id, campaignId = null) {
  logger.info(`[RDS-CAMPAIGN-DEBUG] Buscando contato com ID: ${id}, Campaign ID: ${campaignId}`);

  // Se temos campaignId, buscar informações da campanha para determinar o tipo
  let companyId = null;
  let isTagCampaign = false;
  if (campaignId) {
    const campaign = await Campaign.findByPk(campaignId, { attributes: ["companyId", "tagListId", "contactListId"] });
    if (campaign) {
      companyId = campaign.companyId;
      isTagCampaign = campaign.tagListId && !campaign.contactListId;
    }
  }

  // Para campanhas por tag, buscar diretamente na tabela Contact
  if (isTagCampaign) {
    const whereClause = companyId ? { id, companyId } : { id };
    const contact = await Contact.findOne({
      where: whereClause,
      attributes: ["id", "name", "number", "email", "isGroup"]
    });

    if (contact) {
      logger.info(`[RDS-CAMPAIGN-DEBUG] Contato encontrado em Contact (campanha por tag): ${contact.name} (Company: ${contact.companyId || 'N/A'})`);
      return contact;
    }

    logger.error(`[RDS-CAMPAIGN-DEBUG] ERRO: Contato com ID ${id} não encontrado na tabela Contact para campanha por tag (Company filter: ${companyId || 'none'})`);
    return null;
  }

  // Para campanhas por lista de contatos, buscar primeiro em ContactListItem
  const contactListItem = await ContactListItem.findByPk(id, {
    attributes: ["id", "name", "number", "email", "isGroup"]
  });

  if (contactListItem) {
    logger.info(`[RDS-CAMPAIGN-DEBUG] Contato encontrado em ContactListItem: ${contactListItem.name}`);
    return contactListItem;
  }

  // Fallback: buscar na tabela Contact
  const whereClause = companyId ? { id, companyId } : { id };
  const contact = await Contact.findOne({
    where: whereClause,
    attributes: ["id", "name", "number", "email", "isGroup"]
  });

  if (contact) {
    logger.info(`[RDS-CAMPAIGN-DEBUG] Contato encontrado em Contact (fallback): ${contact.name} (Company: ${contact.companyId || 'N/A'})`);
    return contact;
  }

  logger.error(`[RDS-CAMPAIGN-DEBUG] ERRO: Contato com ID ${id} não encontrado em nenhuma tabela (Company filter: ${companyId || 'none'})`);
  return null;
}

async function getSettings(campaign): Promise<CampaignSettings> {
  try {
    const settings = await CampaignSetting.findAll({
      where: { companyId: campaign.companyId },
      attributes: ["key", "value"]
    });

    let messageInterval: number = 20;
    let longerIntervalAfter: number = 20;
    let greaterInterval: number = 60;
    let variables: any[] = [];

    settings.forEach(setting => {
      if (setting.key === "messageInterval") {
        messageInterval = JSON.parse(setting.value);
      }
      if (setting.key === "longerIntervalAfter") {
        longerIntervalAfter = JSON.parse(setting.value);
      }
      if (setting.key === "greaterInterval") {
        greaterInterval = JSON.parse(setting.value);
      }
      if (setting.key === "variables") {
        variables = JSON.parse(setting.value);
      }
    });

    return {
      messageInterval,
      longerIntervalAfter,
      greaterInterval,
      variables
    };
  } catch (error) {
    console.log(error);
    throw error; // rejeita a Promise com o erro original
  }
}

export function parseToMilliseconds(seconds) {
  return seconds * 1000;
}

async function sleep(seconds) {
  logger.info(
    `Sleep de ${seconds} segundos iniciado: ${moment().format("HH:mm:ss")}`
  );
  return new Promise(resolve => {
    setTimeout(() => {
      logger.info(
        `Sleep de ${seconds} segundos finalizado: ${moment().format(
          "HH:mm:ss"
        )}`
      );
      resolve(true);
    }, parseToMilliseconds(seconds));
  });
}

function getCampaignValidMessages(campaign) {
  const messages = [];

  if (!isEmpty(campaign.message1) && !isNil(campaign.message1)) {
    messages.push(campaign.message1);
  }

  if (!isEmpty(campaign.message2) && !isNil(campaign.message2)) {
    messages.push(campaign.message2);
  }

  if (!isEmpty(campaign.message3) && !isNil(campaign.message3)) {
    messages.push(campaign.message3);
  }

  if (!isEmpty(campaign.message4) && !isNil(campaign.message4)) {
    messages.push(campaign.message4);
  }

  if (!isEmpty(campaign.message5) && !isNil(campaign.message5)) {
    messages.push(campaign.message5);
  }

  return messages;
}

function getCampaignValidConfirmationMessages(campaign) {
  const messages = [];

  if (
    !isEmpty(campaign.confirmationMessage1) &&
    !isNil(campaign.confirmationMessage1)
  ) {
    messages.push(campaign.confirmationMessage1);
  }

  if (
    !isEmpty(campaign.confirmationMessage2) &&
    !isNil(campaign.confirmationMessage2)
  ) {
    messages.push(campaign.confirmationMessage2);
  }

  if (
    !isEmpty(campaign.confirmationMessage3) &&
    !isNil(campaign.confirmationMessage3)
  ) {
    messages.push(campaign.confirmationMessage3);
  }

  if (
    !isEmpty(campaign.confirmationMessage4) &&
    !isNil(campaign.confirmationMessage4)
  ) {
    messages.push(campaign.confirmationMessage4);
  }

  if (
    !isEmpty(campaign.confirmationMessage5) &&
    !isNil(campaign.confirmationMessage5)
  ) {
    messages.push(campaign.confirmationMessage5);
  }

  return messages;
}

function ensureCampaignMarker(text: string): string {
  if (!text) return "";
  return /\u200c/.test(text) ? text : `\u200c ${text}`;
}

function getProcessedMessage(msg: string, variables: any[], contact: any) {
  let finalMessage = msg;

  if (finalMessage.includes("{nome}")) {
    finalMessage = finalMessage.replace(/{nome}/g, contact?.name || "");
  }
  if (finalMessage.includes("[nome]")) {
    finalMessage = finalMessage.replace(/\[nome\]/g, contact?.name || "");
  }

  if (finalMessage.includes("{email}")) {
    finalMessage = finalMessage.replace(/{email}/g, contact?.email || "");
  }
  if (finalMessage.includes("[email]")) {
    finalMessage = finalMessage.replace(/\[email\]/g, contact?.email || "");
  }

  if (finalMessage.includes("{numero}")) {
    finalMessage = finalMessage.replace(/{numero}/g, contact?.number || "");
  }
  if (finalMessage.includes("[numero]")) {
    finalMessage = finalMessage.replace(/\[numero\]/g, contact?.number || "");
  }
  // Alias comum
  if (finalMessage.includes("{telefone}")) {
    finalMessage = finalMessage.replace(/{telefone}/g, contact?.number || "");
  }
  if (finalMessage.includes("[telefone]")) {
    finalMessage = finalMessage.replace(/\[telefone\]/g, contact?.number || "");
  }
  // Data/hora padrões
  if (finalMessage.includes("{data}") || finalMessage.includes("[data]")) {
    const d = moment().format("DD/MM/YYYY");
    finalMessage = finalMessage.replace(/{data}/g, d).replace(/\[data\]/g, d);
  }
  if (finalMessage.includes("{hora}") || finalMessage.includes("[hora]")) {
    const h = moment().format("HH:mm");
    finalMessage = finalMessage.replace(/{hora}/g, h).replace(/\[hora\]/g, h);
  }

  if (variables[0]?.value !== "[]") {
    variables.forEach(variable => {
      const safeValue = (variable?.value ?? "") as string;
      if (finalMessage.includes(`{${variable.key}}`)) {
        const regex = new RegExp(`{${variable.key}}`, "g");
        finalMessage = finalMessage.replace(regex, safeValue);
      }
      if (finalMessage.includes(`[${variable.key}]`)) {
        const regexSq = new RegExp(`\\[${variable.key}\\]`, "g");
        finalMessage = finalMessage.replace(regexSq, safeValue);
      }
    });
  }

  return finalMessage;
}

const checkerWeek = async () => {
  const sab = moment().day() === 6;
  const dom = moment().day() === 0;

  const sabado = await CampaignSetting.findOne({
    where: { key: "sabado" }
  });

  const domingo = await CampaignSetting.findOne({
    where: { key: "domingo" }
  });

  if (sabado?.value === "false" && sab) {
    messageQueue.pause();
    return true;
  }

  if (domingo?.value === "false" && dom) {
    messageQueue.pause();
    return true;
  }

  messageQueue.resume();
  return false;
};

const checkTime = async () => {
  const startHour = await CampaignSetting.findOne({
    where: {
      key: "startHour"
    }
  });

  const endHour = await CampaignSetting.findOne({
    where: {
      key: "endHour"
    }
  });

  const hour = startHour.value as unknown as number;
  const endHours = endHour.value as unknown as number;

  const timeNow = moment().format("HH:mm") as unknown as number;

  if (timeNow <= endHours && timeNow >= hour) {
    messageQueue.resume();

    return true;
  }

  logger.info(
    `Envio inicia as ${hour} e termina as ${endHours}, hora atual ${timeNow} não está dentro do horário`
  );
  messageQueue.clean(0, "delayed");
  messageQueue.clean(0, "wait");
  messageQueue.clean(0, "active");
  messageQueue.clean(0, "completed");
  messageQueue.clean(0, "failed");
  messageQueue.pause();

  return false;
};

// const checkerLimitToday = async (whatsappId: number) => {
//   try {

//     const setting = await SettingMessage.findOne({
//       where: { whatsappId: whatsappId }
//     });

//     const lastUpdate = moment(setting.dateStart);

//     const now = moment();

//     const passou = now.isAfter(lastUpdate, "day");

//     if (setting.sendToday <= setting.limit) {
//       await setting.update({
//         dateStart: moment().format()
//       });

//       return true;
//     }

//     const zerar = true
//     if(passou) {
//       await setting.update({
//         sendToday: 0,
//         dateStart: moment().format()
//       });

//       setting.reload();
//     }

//     setting.reload();

//     logger.info(`Enviada hoje ${setting.sendToday} limite ${setting.limit}`);
//     // sendMassMessage.clean(0, "delayed");
//     // sendMassMessage.clean(0, "wait");
//     // sendMassMessage.clean(0, "active");
//     // sendMassMessage.clean(0, "completed");
//     // sendMassMessage.clean(0, "failed");
//     // sendMassMessage.pause();
//     return false;
//   } catch (error) {
//     logger.error("conexão não tem configuração de envio.");
//   }
// };

export function randomValue(min, max) {
  return Math.floor(Math.random() * max) + min;
}

async function verifyAndFinalizeCampaign(campaign) {
  // Garantir que a campanha tenha os contatos carregados
  const campaignWithContacts = await getCampaign(campaign.id);
  if (!campaignWithContacts?.contactList?.contacts) {
    logger.warn(
      `[VERIFY CAMPAIGN] Campanha ${campaign.id}: contactList/contacts ausente — ignorando finalização por contagem`
    );
    return;
  }
  const { companyId, contacts } = campaignWithContacts.contactList;
  if (!contacts.length) {
    logger.warn(
      `[VERIFY CAMPAIGN] Campanha ${campaign.id}: 0 contatos na lista — ignorando finalização por contagem`
    );
    return;
  }

  const deliveredCount = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: {
        [Op.ne]: null
      }
      // ✅ Remover condição de confirmação que pode estar impedindo a contagem
    }
  });

  const realExecutionCount = Math.floor(deliveredCount / contacts.length);

  logger.info(`[VERIFY CAMPAIGN] Campanha ${campaign.id}: ${deliveredCount} mensagens entregues de ${contacts.length} contatos, ${realExecutionCount} execuções reais vs ${campaign.executionCount} registradas`);
  logger.info(`[VERIFY CAMPAIGN] Campanha ${campaign.id}: isRecurring=${campaign.isRecurring}, maxExecutions=${campaign.maxExecutions}, status=${campaign.status}`);

  if (realExecutionCount > campaign.executionCount) {
    logger.info(`[VERIFY CAMPAIGN] Corrigindo executionCount da campanha ${campaign.id} de ${campaign.executionCount} para ${realExecutionCount}`);

    await campaign.update({
      executionCount: realExecutionCount,
      lastExecutedAt: new Date()
    });

    if (campaign.isRecurring && campaign.maxExecutions && realExecutionCount >= campaign.maxExecutions) {
      logger.info(`[VERIFY CAMPAIGN] Campanha ${campaign.id} atingiu limite de ${campaign.maxExecutions} execuções após correção - finalizando`);
      await campaign.update({
        status: "FINALIZADA",
        completedAt: moment()
      });
      return;
    }
  }

  // ✅ Lógica simplificada de finalização
  const currentExecutionCount = Math.floor(deliveredCount / contacts.length);

  // Atualizar executionCount se necessário
  if (currentExecutionCount > campaign.executionCount) {
    await campaign.update({
      executionCount: currentExecutionCount,
      lastExecutedAt: new Date()
    });
    logger.info(`[RDS-VERIFY CAMPAIGN] Campanha ${campaign.id} executionCount atualizado para: ${currentExecutionCount}`);
  }

  // Verificar se deve finalizar a campanha
  if (campaign.isRecurring) {
    // Campanha recorrente: finalizar apenas se atingiu limite de execuções
    if (campaign.maxExecutions && currentExecutionCount >= campaign.maxExecutions) {
      logger.info(`[RDS-VERIFY CAMPAIGN] Campanha ${campaign.id} atingiu limite de ${campaign.maxExecutions} execuções - finalizando`);
      await campaign.update({
        status: "FINALIZADA",
        completedAt: moment()
      });
    } else if (currentExecutionCount > 0) {
      logger.info(`[RDS-VERIFY CAMPAIGN] Campanha ${campaign.id} é recorrente - agendando próxima execução (${currentExecutionCount}/${campaign.maxExecutions || 'ilimitado'})`);
      await RecurrenceService.scheduleNextExecution(campaign.id);
    }
  } else {
    // Campanha não recorrente: finalizar quando todas as mensagens foram entregues
    if (deliveredCount >= contacts.length) {
      logger.info(`[RDS-VERIFY CAMPAIGN] Campanha ${campaign.id} não é recorrente - todas as ${deliveredCount} mensagens foram entregues - finalizando`);
      await campaign.update({
        status: "FINALIZADA",
        completedAt: moment()
      });
    }
  }

  const io = getIO();
  io.of(`/${companyId}`).emit(`company-${campaign.companyId}-campaign`, {
    action: "update",
    record: campaign
  });
}

async function handleProcessCampaign(job) {
  try {
    const { id, restartMode, messageInterval: customMessageInterval, longerIntervalAfter: customLongerIntervalAfter, greaterInterval: customGreaterInterval }: ProcessCampaignData = job.data;
    const campaign = await getCampaign(id);
    if (!campaign) {
      logger.error(`[PROCESS-CAMPAIGN] Campanha ${id} não encontrada`);
      return;
    }
    const settings = await getSettings(campaign);
    {
      const contacts = campaign.contactList?.contacts;
      if (isArray(contacts)) {
        let contactData = contacts.map(contact => ({
          contactId: contact.id,
          campaignId: campaign.id,
          variables: settings.variables,
          isGroup: contact.isGroup
        }));

        if (restartMode) {
          const deliveredRows = await CampaignShipping.findAll({
            where: {
              campaignId: campaign.id,
              deliveredAt: { [Op.ne]: null }
            },
            attributes: ["number", "contactId"],
            raw: true
          });

          const deliveredDigits = new Set(
            deliveredRows
              .map((r: { number?: string }) => normalizeCampaignPhoneDigits(r.number))
              .filter(Boolean)
          );
          const deliveredContactIds = new Set(
            deliveredRows
              .map((r: { contactId?: number }) => r.contactId)
              .filter((cid): cid is number => cid != null)
          );

          const pendingContacts = contacts.filter((contact: { id: number; number?: string }) => {
            if (deliveredContactIds.has(contact.id)) return false;
            const digits = normalizeCampaignPhoneDigits(contact.number);
            if (digits && deliveredDigits.has(digits)) return false;
            const raw = contact.number != null ? String(contact.number).trim() : "";
            if (raw && deliveredRows.some((r: { number?: string }) => r.number && String(r.number).trim() === raw))
              return false;
            return true;
          });

          contactData = pendingContacts.map(contact => ({
            contactId: contact.id,
            campaignId: campaign.id,
            variables: settings.variables,
            isGroup: contact.isGroup
          }));

          console.log(
            `[RESTART] Campanha ${campaign.id}: ${contactData.length} contatos pendentes de ${contacts.length} total`
          );
        }

        const messageInterval = restartMode ? (customMessageInterval || 20) : settings.messageInterval;
        const longerIntervalAfter = restartMode ? (customLongerIntervalAfter || 20) : settings.longerIntervalAfter;
        const greaterInterval = restartMode ? (customGreaterInterval || 60) : settings.greaterInterval;

        if (contactData.length === 0) {
          if (restartMode) {
            logger.info(
              `[PROCESS-CAMPAIGN] Reinício sem pendentes — campanha ${campaign.id} já concluída para todos os contatos`
            );
            await campaign.update({
              status: "FINALIZADA",
              completedAt: moment()
            });
            const io = getIO();
            io.of(`/${campaign.companyId}`).emit(`company-${campaign.companyId}-campaign`, {
              action: "update",
              record: campaign
            });
          } else {
            console.log(`[PROCESS-CAMPAIGN] Nenhum contato pendente encontrado para campanha ${campaign.id}`);
          }
          return;
        }

        const queuePromises = [];
        let currentDelay = 0; // base em milissegundos

        for (let i = 0; i < contactData.length; i++) {
          const { contactId, campaignId, variables } = contactData[i];

          // Regra de intervalo:
          // - Para Enviar Agora (restartMode = true): o PRIMEIRO contato vai com delay 0,
          //   e a partir do segundo aplica-se o intervalo escolhido (messageInterval/greatInterval).
          // - Para execuções normais (agendadas), mantém o comportamento antigo (sempre aplica intervalo).
          if (restartMode) {
            if (i === 0) {
              currentDelay = 0;
            } else if (i > longerIntervalAfter) {
              currentDelay += greaterInterval * 1000;
            } else {
              currentDelay += messageInterval * 1000;
            }
          } else {
            if (i > longerIntervalAfter) {
              currentDelay += greaterInterval * 1000;
            } else {
              currentDelay += messageInterval * 1000;
            }
          }

          const queuePromise = campaignQueue.add(
            "PrepareContact",
            { contactId, campaignId, variables },
            {
              removeOnComplete: true,
              delay: currentDelay
            }
          );
          queuePromises.push(queuePromise);
        }

        console.log(`[CAMPAIGN] ${queuePromises.length} jobs adicionados à fila para campanha ${campaign.id}`);
        await Promise.all(queuePromises);
      } else {
        console.log(`[PROCESS-CAMPAIGN] ERRO: Lista de contatos não é um array para campanha ${campaign.id}`);
      }
    }
  } catch (err: any) {
    Sentry.captureException(err);
  }
}

function calculateDelay(
  index,
  baseDelay,
  longerIntervalAfter,
  greaterInterval,
  messageInterval
) {
  const diffSeconds = differenceInSeconds(baseDelay, new Date());
  let finalDelay;

  if (index > longerIntervalAfter) {
    finalDelay = diffSeconds * 1000 + greaterInterval;
  } else {
    finalDelay = diffSeconds * 1000 + messageInterval;
  }

  console.log(`[CALCULATE-DELAY] Index: ${index}, DiffSeconds: ${diffSeconds}, FinalDelay: ${finalDelay}ms`);

  return finalDelay;
}

async function handlePrepareContact(job) {
  try {
    const { contactId, campaignId, variables }: PrepareContactData = job.data;

    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      return;
    }

    if (campaign.status === "CANCELADA") {
      return;
    }

    const contact = await getContact(contactId, campaignId);

    if (!contact) {
      logger.error(`[CAMPAIGN] Contato ${contactId} não encontrado para campanha ${campaignId}`);
      return;
    }

    if (!contact.number) {
      logger.error(`[CAMPAIGN] Contato ${contactId} (${contact.name || 'sem nome'}) não possui número de telefone`);
      return;
    }

    const campaignShipping: any = {};
    campaignShipping.number = contact.number;

    if (campaign.tagListId && !campaign.contactListId) {
      campaignShipping.contactId = null;
    } else {
      campaignShipping.contactId = contactId;
    }

    campaignShipping.campaignId = campaignId;
    const messages = getCampaignValidMessages(campaign);

  let localVars = Array.isArray(variables) ? [...variables] : [];
  try {
    localVars.push(
      { key: "nome", value: contact.name || "" },
      { key: "email", value: contact.email || "" },
      { key: "numero", value: contact.number || "" },
      { key: "telefone", value: contact.number || "" },
      { key: "data", value: moment().format("DD/MM/YYYY") },
      { key: "hora", value: moment().format("HH:mm") }
    );
    const comp = await Company.findByPk(campaign.companyId, { attributes: ["name"] });
    localVars.push({ key: "empresa", value: comp?.name || "" });
  } catch {
    localVars.push({ key: "empresa", value: "" });
  }
  ["razao_social","endereco","produto","valor","vencimento","cargo"].forEach(k => {
    if (!localVars.find(v => v.key === k)) localVars.push({ key: k, value: "" });
  });

    if (messages.length >= 0) {
      const radomIndex = randomValue(0, messages.length);

      const message = getProcessedMessage(
        messages[radomIndex] || "",
        localVars,
        contact
      );

      campaignShipping.message =
        message === null ? "" : ensureCampaignMarker(message);
    }

    if (campaign.confirmation) {
      const confirmationMessages = getCampaignValidConfirmationMessages(campaign);
      if (confirmationMessages.length) {
        const radomIndex = randomValue(0, confirmationMessages.length);
        // Reutilizar as mesmas variáveis locais para confirmação
        const message = getProcessedMessage(
          confirmationMessages[radomIndex] || "",
          localVars,
          contact
        );
        campaignShipping.confirmationMessage = ensureCampaignMarker(message);
      }
    }

    let record, created;

    if (campaign.isRecurring && campaign.executionCount > 0) {
      record = await CampaignShipping.create(campaignShipping);
      created = true;
    } else {
      let whereClause;
      if (campaign.tagListId && !campaign.contactListId) {
        whereClause = {
          campaignId: campaignShipping.campaignId,
          number: campaignShipping.number
        };
      } else {
        whereClause = {
          campaignId: campaignShipping.campaignId,
          contactId: campaignShipping.contactId
        };
      }

      [record, created] = await CampaignShipping.findOrCreate({
        where: whereClause,
        defaults: campaignShipping
      });
    }

    // Verificar se o record já foi entregue (para campanhas reiniciadas)
    if (!created && record.deliveredAt !== null) {
      return;
    }

    if (
      !created &&
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      record.set(campaignShipping);
      await record.save();
    }

    if (
      record.deliveredAt === null &&
      record.confirmationRequestedAt === null
    ) {
      const nextJob = await campaignQueue.add(
        "DispatchCampaign",
        {
          campaignId: campaign.id,
          campaignShippingId: record.id,
          contactListItemId: contactId
        }
      );

      await record.update({ jobId: String(nextJob.id) });
    }

  } catch (err: any) {
    console.log(`[PREPARE-CONTACT] ERRO no job ${job.id}:`, err.message);
    console.log(`[PREPARE-CONTACT] Stack trace:`, err.stack);
    Sentry.captureException(err);
    logger.error(`campaignQueue -> PrepareContact -> error: ${err.message}`);
  }
}

async function handleDispatchCampaign(job) {
  try {
    const { data } = job;
    const { campaignShippingId, campaignId }: DispatchCampaignData = data;

    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      logger.error(`[CAMPAIGN] Campanha ${campaignId} não encontrada`);
      return;
    }

    // Verificar se a campanha não está cancelada
    if (campaign.status === "CANCELADA") {
      return;
    }

    const campaignShipping = await CampaignShipping.findByPk(
      campaignShippingId,
      {
        include: [{ model: ContactListItem, as: "contact" }]
      }
    );

    if (!campaignShipping) {
      logger.error(`[CAMPAIGN] CampaignShipping ${campaignShippingId} não encontrado`);
      return;
    }

    if (campaign.whatsapp?.channel === "sms") {
      logger.info(
        `Disparo campanha SMS: Campanha=${campaignId};Registro=${campaignShippingId}`
      );
      await runSmsCampaignDispatch(campaign, campaignShipping);
      await verifyAndFinalizeCampaign(campaign);
      const ioSms = getIO();
      ioSms.of(`/${campaign.companyId}`).emit(
        `company-${campaign.companyId}-campaign`,
        { action: "update", record: campaign }
      );
      logger.info(
        `[CAMPAIGN][SMS] Enviado para ${campaignShipping.contact?.name || campaignShipping.number}`
      );
      return;
    }

    if (campaign.whatsapp?.channel === "telegram") {
      logger.info(
        `Disparo campanha Telegram: Campanha=${campaignId};Registro=${campaignShippingId}`
      );
      await runTelegramCampaignDispatch(campaign, campaignShipping);
      await verifyAndFinalizeCampaign(campaign);
      const ioTg = getIO();
      ioTg.of(`/${campaign.companyId}`).emit(
        `company-${campaign.companyId}-campaign`,
        { action: "update", record: campaign }
      );
      logger.info(
        `[CAMPAIGN][TELEGRAM] Enviado para ${campaignShipping.contact?.name || campaignShipping.number}`
      );
      return;
    }

    if (campaign.whatsapp?.channel === "whatsapp_oficial") {
      logger.info(
        `Disparo campanha WhatsApp API Oficial: Campanha=${campaignId};Registro=${campaignShippingId}`
      );
      await runWhatsAppOficialCampaignDispatch(campaign, campaignShipping);
      await verifyAndFinalizeCampaign(campaign);
      const ioWaba = getIO();
      ioWaba.of(`/${campaign.companyId}`).emit(
        `company-${campaign.companyId}-campaign`,
        { action: "update", record: campaign }
      );
      logger.info(
        `[CAMPAIGN][WABA] Enviado para ${campaignShipping.contact?.name || campaignShipping.number}`
      );
      return;
    }

    const wbot = await GetWhatsappWbot(campaign.whatsapp);

    if (!wbot) {
      logger.error(`[CAMPAIGN] Wbot não encontrado para campanha ${campaignId}`);
      return;
    }

    if (!campaign.whatsapp) {
      logger.error(`[CAMPAIGN] WhatsApp não encontrado para campanha ${campaignId}`);
      return;
    }

    if (!wbot?.user?.id) {
      logger.error(`[CAMPAIGN] Usuário do wbot não encontrado para campanha ${campaignId}`);
      return;
    }

    logger.info(`Disparo de campanha solicitado: Campanha=${campaignId};Registro=${campaignShippingId}`);

    let chatId;
    if (campaignShipping.contact && campaignShipping.contact.isGroup) {
      chatId = `${campaignShipping.number}@g.us`;
    } else {
      const isGroupNumber = campaignShipping.number.includes('@') || campaignShipping.number.length > 15;
      chatId = isGroupNumber
        ? `${campaignShipping.number}@g.us`
        : `${campaignShipping.number}@s.whatsapp.net`;
    }

    if (campaign.openTicket === "enabled") {
      const [contact] = await Contact.findOrCreate({
        where: {
          number: campaignShipping.number,
          companyId: campaign.companyId
        },
        defaults: {
          companyId: campaign.companyId,
          name: campaignShipping.contact ? campaignShipping.contact.name : "Contato da Campanha",
          number: campaignShipping.number,
          email: campaignShipping.contact ? campaignShipping.contact.email : "",
          whatsappId: campaign.whatsappId,
          profilePicUrl: ""
        }
      });
      const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);

      let ticket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId: campaign.companyId,
          whatsappId: whatsapp.id,
          status: ["open", "pending"]
        }
      });

      if (!ticket) {
        ticket = await Ticket.create({
          companyId: campaign.companyId,
          contactId: contact.id,
          whatsappId: whatsapp.id,
          queueId: campaign?.queueId,
          userId: campaign?.userId,
          status: campaign?.statusTicket,
          isBot: false,
          useIntegration: false
        });
      } else {
        await clearCampaignTicketAgentFlags(ticket);
      }

      ticket = await ShowTicketService(ticket.id, campaign.companyId);

      if (whatsapp.status !== "CONNECTED") {
        logger.warn(
          `[CAMPAIGN] Disparo ignorado (ticket aberto): WhatsApp ${whatsapp?.id} status=${whatsapp?.status} — campanha ${campaignId}, shipping ${campaignShippingId}`
        );
      }

      if (whatsapp.status === "CONNECTED") {
        if (campaign.confirmation && campaignShipping.confirmation === null) {
          const confirmationMessage = await wbot.sendMessage(getJidOf(chatId), {
            text: ensureCampaignMarker(campaignShipping.confirmationMessage)
          });

          await verifyMessage(
            confirmationMessage,
            ticket,
            contact,
            null,
            false,
            false
          );

          await campaignShipping.update({ confirmationRequestedAt: moment() });
        } else {
          if (!campaign.mediaPath) {
            console.log(`[DISPATCH-CAMPAIGN] Enviando mensagem de texto para: ${chatId}`);
            console.log(`[DISPATCH-CAMPAIGN] Conteúdo da mensagem: ${campaignShipping.message}`);

            const sentMessage = await wbot.sendMessage(getJidOf(chatId), {
              text: ensureCampaignMarker(campaignShipping.message)
            });

            console.log(`[DISPATCH-CAMPAIGN] Mensagem enviada com sucesso: ${sentMessage ? 'SIM' : 'NÃO'}`);

            await verifyMessage(
              sentMessage,
              ticket,
              contact,
              null,
              false,
              false
            );
          }

          if (campaign.mediaPath) {
            const publicFolder = path.resolve(__dirname, "..", "public");
            const filePath = path.join(
              publicFolder,
              `company${campaign.companyId}`,
              campaign.mediaPath
            );

            const options = await getMessageOptions(
              campaign.mediaName,
              filePath,
              String(campaign.companyId),
              ensureCampaignMarker(campaignShipping.message)
            );
            if (Object.keys(options).length) {
              if (options.mimetype === "audio/mp4") {
              const audioMessage = await wbot.sendMessage(getJidOf(chatId), {
                text: ensureCampaignMarker(campaignShipping.message)
                });

                await verifyMessage(
                  audioMessage,
                  ticket,
                  contact,
                  null,
                  false,
                  false
                );
              }
              const sentMessage = await wbot.sendMessage(getJidOf(chatId), {
                ...options
              });

              await verifyMediaMessage(
                sentMessage,
                ticket,
                ticket.contact,
                null,
                false,
                false,
                wbot
              );
            }
          }
          // if (campaign?.statusTicket === 'closed') {
          //   await ticket.update({
          //     status: "closed"
          //   })
          //   const io = getIO();

          //   io.of(String(ticket.companyId))
          //     // .to(ticket.id.toString())
          //     .emit(`company-${ticket.companyId}-ticket`, {
          //       action: "delete",
          //       ticketId: ticket.id
          //     });
          // }
        }
        try {
          const [campTag] = await Tag.findOrCreate({
            where: { name: `Campanha #${campaign.id}`, companyId: campaign.companyId },
            defaults: { color: "#6366f1", kanban: 0 }
          });
          await ContactTag.findOrCreate({
            where: { contactId: contact.id, tagId: campTag.id }
          });
          const prevDw = ticket.dataWebhook as Record<string, unknown> | null | undefined;
          const dw =
            prevDw && typeof prevDw === "object" && !Array.isArray(prevDw)
              ? { ...prevDw }
              : {};
          (dw as Record<string, unknown>).sourceCampaignId = campaign.id;
          await Ticket.update(
            { dataWebhook: dw as any },
            { where: { id: ticket.id, companyId: campaign.companyId } }
          );
        } catch (markErr) {
          logger.warn(`[CAMPAIGN] Falha ao marcar contato/ticket com origem campanha: ${markErr}`);
        }
        // Só conta como "entregue" o disparo principal — não após só a mensagem de confirmação.
        // Caso contrário deliveredCount >= contacts.length finaliza a campanha antes da resposta do contato
        // e verifyRecentCampaign deixa de enfileirar o envio real (campanha já não está EM_ANDAMENTO).
        const shouldMarkDeliveredOpenTicket =
          !campaign.confirmation || campaignShipping.confirmation !== null;
        if (shouldMarkDeliveredOpenTicket) {
          await campaignShipping.update({ deliveredAt: moment() });
          try {
            const io = getIO();
            io.of(`/${campaign.companyId}`).emit(`company-${campaign.companyId}-campaign-shipping`, {
              action: "delivered",
              campaignId: campaign.id,
              shippingId: campaignShipping.id,
              number: campaignShipping.number,
              contactName: campaignShipping?.contact?.name || null,
              deliveredAt: campaignShipping.deliveredAt
            });
          } catch {}
        }
      }
    } else {
      if (campaign.confirmation && campaignShipping.confirmation === null) {
        await wbot.sendMessage(getJidOf(chatId), {
          text: ensureCampaignMarker(campaignShipping.confirmationMessage)
        });
        await campaignShipping.update({ confirmationRequestedAt: moment() });
      } else {
        if (!campaign.mediaPath) {
          console.log(`[DISPATCH-CAMPAIGN] Enviando mensagem SEM ticket para: ${chatId}`);
          console.log(`[DISPATCH-CAMPAIGN] Conteúdo da mensagem: ${campaignShipping.message}`);

          const sentMessage = await wbot.sendMessage(getJidOf(chatId), {
            text: ensureCampaignMarker(campaignShipping.message)
          });

          console.log(`[DISPATCH-CAMPAIGN] Mensagem enviada com sucesso (sem ticket): ${sentMessage ? 'SIM' : 'NÃO'}`);
        }

        if (campaign.mediaPath) {
          const publicFolder = path.resolve(__dirname, "..", "public");
          const filePath = path.join(
            publicFolder,
            `company${campaign.companyId}`,
            campaign.mediaPath
          );

          const options = await getMessageOptions(
            campaign.mediaName,
            filePath,
            String(campaign.companyId),
            ensureCampaignMarker(campaignShipping.message)
          );
          if (Object.keys(options).length) {
            if (options.mimetype === "audio/mp4") {
              await wbot.sendMessage(getJidOf(chatId), {
                text: ensureCampaignMarker(campaignShipping.message)
              });
            }
            await wbot.sendMessage(getJidOf(chatId), { ...options });
          }
        }
      }

      const shouldMarkDeliveredNoTicket =
        !campaign.confirmation || campaignShipping.confirmation !== null;
      if (shouldMarkDeliveredNoTicket) {
        await campaignShipping.update({ deliveredAt: moment() });
        try {
          const io = getIO();
          io.of(`/${campaign.companyId}`).emit(`company-${campaign.companyId}-campaign-shipping`, {
            action: "delivered",
            campaignId: campaign.id,
            shippingId: campaignShipping.id,
            number: campaignShipping.number,
            contactName: campaignShipping?.contact?.name || null,
            deliveredAt: campaignShipping.deliveredAt
          });
        } catch {}
      }
    }

    await verifyAndFinalizeCampaign(campaign);

    const io = getIO();
    io.of(`/${campaign.companyId}`).emit(
      `company-${campaign.companyId}-campaign`,
      {
        action: "update",
        record: campaign
      }
    );

    logger.info(
      `Campanha enviada para: Campanha=${campaignId};Contato=${campaignShipping.contact ? campaignShipping.contact.name : campaignShipping.number}`
    );
  } catch (err: any) {
    Sentry.captureException(err);
    const cid = job?.data?.campaignId;
    const sid = job?.data?.campaignShippingId;
    logger.error(`[CAMPAIGN] Falha no disparo campanha=${cid} shipping=${sid}: ${err.message}`);
    console.log(err.stack);
  }
}

async function handleLoginStatus(job) {
  const thresholdTime = new Date();
  thresholdTime.setMinutes(thresholdTime.getMinutes() - 5);

  await User.update(
    { online: false },
    {
      where: {
        updatedAt: { [Op.lt]: thresholdTime },
        online: true
      }
    }
  );
}

async function handleResumeTicketsOutOfHour(job) {
  // logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ["id", "name"],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"],
          where: {
            timeSendQueue: { [Op.gt]: 0 }
          }
        }
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {
        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {
            if (
              !isNaN(idQueue) &&
              Number.isInteger(idQueue) &&
              !isNaN(timeQueue) &&
              Number.isInteger(timeQueue)
            ) {
              const tempoPassado = moment()
                .subtract(timeQueue, "minutes")
                .utc()
                .format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id", "channel"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                  // isOutOfHour: false
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: [
                      "id",
                      "name",
                      "number",
                      "email",
                      "profilePicUrl",
                      "acceptAudioMessage",
                      "active",
                      "disableBot",
                      "urlPicture",
                      "lgpdAcceptedAt",
                      "companyId"
                    ],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: [
                      "id",
                      "name",
                      "expiresTicket",
                      "groupAsTicket",
                      "color"
                    ]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    // .to("notification")
                    // .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(
                    `Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`
                  );
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}

async function handleVerifyQueue(job) {
  // logger.info("Buscando atendimentos perdidos nas filas");
  try {
    const companies = await Company.findAll({
      attributes: ["id", "name"],
      where: {
        status: true
      },
      include: [
        {
          model: Whatsapp,
          attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue"]
        }
      ]
    });

    companies.map(async c => {
      c.whatsapps.map(async w => {
        if (w.status === "CONNECTED") {
          var companyId = c.id;

          const moveQueue = w.timeSendQueue ? w.timeSendQueue : 0;
          const moveQueueId = w.sendIdQueue;
          const moveQueueTime = moveQueue;
          const idQueue = moveQueueId;
          const timeQueue = moveQueueTime;

          if (moveQueue > 0) {
            if (
              !isNaN(idQueue) &&
              Number.isInteger(idQueue) &&
              !isNaN(timeQueue) &&
              Number.isInteger(timeQueue)
            ) {
              const tempoPassado = moment()
                .subtract(timeQueue, "minutes")
                .utc()
                .format();
              // const tempoAgora = moment().utc().format();

              const { count, rows: tickets } = await Ticket.findAndCountAll({
                attributes: ["id", "channel"],
                where: {
                  status: "pending",
                  queueId: null,
                  companyId: companyId,
                  whatsappId: w.id,
                  updatedAt: {
                    [Op.lt]: tempoPassado
                  }
                  // isOutOfHour: false
                },
                include: [
                  {
                    model: Contact,
                    as: "contact",
                    attributes: [
                      "id",
                      "name",
                      "number",
                      "email",
                      "profilePicUrl",
                      "acceptAudioMessage",
                      "active",
                      "disableBot",
                      "urlPicture",
                      "lgpdAcceptedAt",
                      "companyId"
                    ],
                    include: ["extraInfo", "tags"]
                  },
                  {
                    model: Queue,
                    as: "queue",
                    attributes: ["id", "name", "color"]
                  },
                  {
                    model: Whatsapp,
                    as: "whatsapp",
                    attributes: [
                      "id",
                      "name",
                      "expiresTicket",
                      "groupAsTicket",
                      "color"
                    ]
                  }
                ]
              });

              if (count > 0) {
                tickets.map(async ticket => {
                  await ticket.update({
                    queueId: idQueue
                  });

                  await CreateLogTicketService({
                    userId: null,
                    queueId: idQueue,
                    ticketId: ticket.id,
                    type: "redirect"
                  });

                  await ticket.reload();

                  const io = getIO();
                  io.of(String(companyId))
                    // .to("notification")
                    // .to(ticket.id.toString())
                    .emit(`company-${companyId}-ticket`, {
                      action: "update",
                      ticket,
                      ticketId: ticket.id
                    });

                  // io.to("pending").emit(`company-${companyId}-ticket`, {
                  //   action: "update",
                  //   ticket,
                  // });

                  logger.info(
                    `Atendimento Perdido: ${ticket.id} - Empresa: ${companyId}`
                  );
                });
              }
            } else {
              logger.info(`Condição não respeitada - Empresa: ${companyId}`);
            }
          }
        }
      });
    });
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("SearchForQueue -> VerifyQueue: error", e.message);
    throw e;
  }
}

async function handleRandomUser() {
  const jobR = new CronJob('0 */1 * * * *', async () => {
    try {
      const companies = await Company.findAll({
        attributes: ['id', 'name'],
        where: { status: true },
        include: [
          {
            model: Queues,
            attributes: ["id", "name", "ativarRoteador", "tempoRoteador"],
            where: {
              ativarRoteador: true,
              tempoRoteador: { [Op.ne]: 0 }
            }
          }
        ]
      });

      if (!companies || companies.length === 0) return;

      for (const c of companies) {
        try {
          for (const q of c.queues as any[]) {
            const { count, rows: tickets } = await Ticket.findAndCountAll({
              where: {
                companyId: c.id,
                status: "pending",
                queueId: q.id
              },
              include: [
                {
                  model: Contact,
                  as: "contact",
                  include: [
                    {
                      model: ContactWallet,
                      as: "contactWallets",
                      where: { queueId: q.id },
                      required: false
                    }
                  ]
                }
              ]
            });

            const getRandomUserId = (userIds: number[]) => {
              const randomIndex = Math.floor(Math.random() * userIds.length);
              return userIds[randomIndex];
            };

            const findUserById = async (userId: number, companyId: number) => {
              try {
                const user = await User.findOne({
                  where: { id: userId, companyId }
                });
                if (user && user.profile === "user" && (user as any).online === true) {
                  return user.id;
                }
                return 0;
              } catch (errorV) {
                Sentry.captureException(errorV);
                logger.error(`[VerifyUsersRandom] VerifyUsersRandom: error ${String((errorV as any)?.message || errorV)}`);
                return 0;
              }
            };

            if (count > 0) {
              for (const ticket of tickets) {
                try {
                  const { queueId, userId } = ticket as any;
                  const tempoRoteador = q.tempoRoteador;

                  if (ticket.contact && ticket.contact.contactWallets && ticket.contact.contactWallets.length > 0) {
                    const hasWalletForQueue = ticket.contact.contactWallets.some((wallet: any) => wallet.queueId === queueId);
                    if (hasWalletForQueue) {
                      logger.info(`[RANDOM USER] Ticket ${ticket.id} possui carteira definida para fila ${queueId} - pulando randomização`);
                      continue;
                    }
                  }

                  const userQueues = await UserQueue.findAll({
                    where: { queueId }
                  });
                  const userIds = userQueues.map((userQueue: any) => userQueue.userId);
                  if (!userIds || userIds.length === 0) continue;

                  const tempoPassadoB = moment().subtract(tempoRoteador, "minutes").utc().toDate();
                  const updatedAtV = new Date(ticket.updatedAt);

                  const settings = await CompaniesSettings.findOne({
                    where: { companyId: ticket.companyId }
                  });
                  const sendGreetingMessageOneQueues = (settings as any)?.sendGreetingMessageOneQueues === "enabled" || false;

                  if (!userId) {
                    const randomUserId = getRandomUserId(userIds);
                    if (randomUserId !== undefined && (await findUserById(randomUserId, ticket.companyId)) > 0) {
                      await UpdateTicketService({
                        ticketData: { status: "pending", userId: randomUserId, queueId },
                        ticketId: ticket.id,
                        companyId: ticket.companyId
                      });
                      logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                    }
                  } else if (userIds.includes(userId)) {
                    if (tempoPassadoB > updatedAtV) {
                      const availableUserIds = userIds.filter((id: number) => id !== userId);
                      if (availableUserIds.length > 0) {
                        const randomUserId = getRandomUserId(availableUserIds);
                        if (randomUserId !== undefined && (await findUserById(randomUserId, ticket.companyId)) > 0) {
                          await UpdateTicketService({
                            ticketData: { status: "pending", userId: randomUserId, queueId },
                            ticketId: ticket.id,
                            companyId: ticket.companyId
                          });
                          logger.info(`Ticket ID ${ticket.id} atualizado para UserId ${randomUserId} - ${ticket.updatedAt}`);
                        }
                      }
                    }
                  }
                } catch (ticketErr: any) {
                  Sentry.captureException(ticketErr);
                  logger.error(`[VerifyUsersRandom] Ticket ${ticket?.id} erro: ${String(ticketErr?.message || ticketErr)}`);
                }
              }
            }
          }
        } catch (companyErr: any) {
          Sentry.captureException(companyErr);
          logger.error(`[VerifyUsersRandom] Empresa ${c?.id} erro: ${String(companyErr?.message || companyErr)}`);
        }
      }
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error(`[VerifyUsersRandom] VerifyUsersRandom: error ${String(e?.message || e)}`);
      return;
    }
  });
  jobR.start();
}

async function handleProcessLanes() {
  const job = new CronJob("*/1 * * * *", async () => {
    const companies = await Company.findAll({
      include: [
        {
          model: Plan,
          as: "plan",
          attributes: ["id", "name", "useKanban"],
          where: {
            useKanban: true
          }
        }
      ]
    });
    companies.map(async c => {
      try {
        const companyId = c.id;

        const ticketTags = await TicketTag.findAll({
          include: [
            {
              model: Ticket,
              as: "ticket",
              where: {
                status: "open",
                fromMe: true,
                companyId
              },
              attributes: ["id", "contactId", "updatedAt", "whatsappId"]
            },
            {
              model: Tag,
              as: "tag",
              attributes: [
                "id",
                "timeLane",
                "nextLaneId",
                "greetingMessageLane"
              ],
              where: {
                companyId
              }
            }
          ]
        });

        if (ticketTags.length > 0) {
          ticketTags.map(async t => {
            if (
              !isNil(t?.tag.nextLaneId) &&
              t?.tag.nextLaneId > 0 &&
              t?.tag.timeLane > 0
            ) {
              const nextTag = await Tag.findByPk(t?.tag.nextLaneId);

              const dataLimite = new Date();
              dataLimite.setMinutes(
                dataLimite.getMinutes() - Number(t.tag.timeLane)
              );
              const dataUltimaInteracaoChamado = new Date(t.ticket.updatedAt);

              if (dataUltimaInteracaoChamado < dataLimite) {
                await TicketTag.destroy({
                  where: { ticketId: t.ticketId, tagId: t.tagId }
                });
                await TicketTag.create({
                  ticketId: t.ticketId,
                  tagId: nextTag.id
                });

                const whatsapp = await Whatsapp.findByPk(t.ticket.whatsappId);

                if (
                  !isNil(nextTag.greetingMessageLane) &&
                  nextTag.greetingMessageLane !== ""
                ) {
                  const bodyMessage = nextTag.greetingMessageLane;

                  const ticketUpdate = await ShowTicketService(
                    t.ticketId,
                    companyId
                  );

                  if (ticketUpdate.channel === "whatsapp") {
                    // Enviar mensagem de texto
                    const sentMessage = await SendWhatsAppMessage({
                      body: bodyMessage,
                      ticket: ticketUpdate
                    });

                    await verifyMessage(
                      sentMessage,
                      ticketUpdate,
                      ticketUpdate.contact
                    );
                  }

                  if (ticketUpdate.channel === "whatsapp_oficial") {
                    await SendWhatsAppOficialMessage({
                      body: bodyMessage,
                      ticket: ticketUpdate,
                      quotedMsg: null,
                      type: 'text',
                      media: null,
                      vCard: null
                    });
                  }

                  // Enviar mídias se existirem
                  if (nextTag.mediaFiles) {
                    try {
                      const mediaFiles = JSON.parse(nextTag.mediaFiles);
                      for (const mediaFile of mediaFiles) {

                        if (ticketUpdate.channel === "whatsapp") {
                          const sentMedia = await SendWhatsAppMedia({
                            media: mediaFile,
                            ticket: ticketUpdate
                          });
                          await verifyMessage(
                            sentMedia,
                            ticketUpdate,
                            ticketUpdate.contact
                          );
                        }

                        if (ticketUpdate.channel === "whatsapp_oficial") {
                          const mediaSrc = {
                            fieldname: 'medias',
                            originalname: mediaFile.originalname,
                            encoding: '7bit',
                            mimetype: mediaFile.mimetype,
                            filename: mediaFile.filename,
                            path: mediaFile.path
                          } as Express.Multer.File

                          await SendWhatsAppOficialMessage({
                            body: "",
                            ticket: ticketUpdate,
                            type: mediaFile.mimetype.split("/")[0],
                            media: mediaSrc
                          });
                        }

                      }

                    } catch (error) {
                      console.log("Error sending media files in auto lane movement:", error);
                    }
                  }
                }
              }
            }
          });
        }
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("Process Lanes -> Verify: error", e.message);
        throw e;
      }
    });
  });
  job.start();
}

async function handleCloseTicketsAutomatic() {
  const job = new CronJob("*/1 * * * *", async () => {
    const companies = await Company.findAll({
      where: {
        status: true
      }
    });
    companies.map(async c => {
      try {
        const companyId = c.id;
        await ClosedAllOpenTickets(companyId);
      } catch (e: any) {
        Sentry.captureException(e);
        logger.error("ClosedAllOpenTickets -> Verify: error", e.message);
        throw e;
      }
    });
  });
  job.start();
}

async function handleInvoiceCreate() {
  logger.info("GERANDO RECEITA...");
  const job = new CronJob("0 * * * *", async () => {
    try {
      const companies = await Company.findAll({
        where: {
          generateInvoice: true
        }
      });

      for (const c of companies) {
        try {
          const { status, dueDate, id: companyId, planId } = c;

          const date = moment(dueDate).format();
          const timestamp = moment().format();
          const hoje = moment().format("DD/MM/yyyy");
          const vencimento = moment(dueDate).format("DD/MM/yyyy");
          const diff = moment(vencimento, "DD/MM/yyyy").diff(
            moment(hoje, "DD/MM/yyyy")
          );
          const dias = moment.duration(diff).asDays();

          if (status === true) {
            // Verifico se a empresa está a mais de 3 dias sem pagamento
            if (dias <= -3) {
              logger.info(
                `EMPRESA: ${companyId} está VENCIDA A MAIS DE 3 DIAS... INATIVANDO... ${dias}`
              );

              await c.update({ status: false });
              logger.info(`EMPRESA: ${companyId} foi INATIVADA.`);
              logger.info(
                `EMPRESA: ${companyId} Desativando conexões com o WhatsApp...`
              );

              try {
                const whatsapps = await Whatsapp.findAll({
                  where: { companyId },
                  attributes: ["id", "status", "session"]
                });

                for (const whatsapp of whatsapps) {
                  if (whatsapp.session) {
                    await whatsapp.update({
                      status: "DISCONNECTED",
                      session: ""
                    });

                    try {
                      const wbot = await getWbot(whatsapp.id);
                      wbot.logout();
                      logger.info(
                        `EMPRESA: ${companyId} teve o WhatsApp ${whatsapp.id} desconectado...`
                      );
                    } catch (wbotError) {
                      logger.warn(
                        `Erro ao desconectar WhatsApp ${whatsapp.id} da empresa ${companyId}: ${wbotError.message}`
                      );
                    }
                  }
                }
              } catch (whatsappError) {
                logger.error(
                  `Erro ao desconectar WhatsApps da empresa ${companyId}: ${whatsappError.message}`
                );
                Sentry.captureException(whatsappError);
              }
            } else {
              // Buscar o plano da empresa
              const plan = await Plan.findByPk(planId);

              if (!plan) {
                logger.error(
                  `EMPRESA: ${companyId} - Plano não encontrado (planId: ${planId})`
                );
                continue;
              }

              const valuePlan = plan.amount.replace(",", ".");

              // Verificar faturas em aberto
              const sql = `SELECT * FROM "Invoices" WHERE "companyId" = ${c.id} AND "status" = 'open';`
              const openInvoices = await sequelize.query(sql, { type: QueryTypes.SELECT }) as { id: number, dueDate: Date }[];
              const existingInvoice = openInvoices.find(invoice => moment(invoice.dueDate).format("DD/MM/yyyy") === vencimento);

              if (existingInvoice) {
                // Due date already exists, no action needed
                //logger.info(`Fatura Existente`);
              }

              if (openInvoices.length > 0) {
                const invoiceToUpdate = openInvoices[0];
                const updateSql = `UPDATE "Invoices" SET "dueDate" = '${date}', value = ${valuePlan} WHERE "id" = ${invoiceToUpdate.id};`;
                await sequelize.query(updateSql, { type: QueryTypes.UPDATE });

                logger.info(`Fatura Atualizada ID: ${invoiceToUpdate.id} com valor ${valuePlan}`);

              } else {
                const sql = `INSERT INTO "Invoices" ("companyId", "dueDate", detail, status, value, users, connections, queues, "updatedAt", "createdAt")
            VALUES (${c.id}, '${date}', '${plan.name}', 'open', ${valuePlan}, ${plan.users}, ${plan.connections}, ${plan.queues}, '${timestamp}', '${timestamp}');`
                const invoiceInsert = await sequelize.query(sql, { type: QueryTypes.INSERT });

                logger.info(`Fatura Gerada para o cliente: ${c.id}`);
              }
            }
          }
        } catch (e: any) {
          Sentry.captureException(e);
          logger.error("InvoiceCreate -> Verify: error", e);
          throw e;
        }
      }
    } catch (e: any) {
      Sentry.captureException(e);
      logger.error("InvoiceCreate -> Verify: error", e);
      throw e;
    }
  });
  job.start();
}

const skipDbCronJobs = (() => {
  if (process.env.NODE_ENV === "production") return false;
  const flag = String(process.env.DEV_NO_DB || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
})();

if (skipDbCronJobs) {
  logger.info("DEV_NO_DB — crons de fatura/filas/tickets desativados (sem banco)");
} else {
  handleInvoiceCreate();
  handleProcessLanes();
  handleCloseTicketsAutomatic();
  if (String(process.env.ENABLE_VERIFY_RANDOM).toLowerCase() === "true") {
    handleRandomUser();
    logger.info("VerifyUsersRandom habilitado");
  } else {
    logger.info("VerifyUsersRandom desabilitado por configuração");
  }
}

async function handleLidRetry(job) {
  try {
    const { data } = job;
    const { contactId, whatsappId, companyId, number, retryCount, maxRetries = 5 } = data as LidRetryData;

    logger.info(`[RDS-LID-RETRY] Tentativa ${retryCount} de obter LID para contato ${contactId} (${number})`);

    // Buscar o contato e o whatsapp
    const contact = await Contact.findByPk(contactId);
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!contact) {
      logger.error(`[RDS-LID-RETRY] Contato ${contactId} não encontrado. Cancelando retentativa.`);
      return;
    }

    if (!whatsapp || whatsapp.status !== "CONNECTED") {
      logger.error(`[RDS-LID-RETRY] WhatsApp ${whatsappId} não está conectado. Reagendando retentativa.`);

      // Se ainda não atingiu o limite de retentativas, reagendar
      if (retryCount < maxRetries) {
        await lidRetryQueue.add(
          "RetryLidLookup",
          {
            contactId,
            whatsappId,
            companyId,
            number,
            retryCount: retryCount + 1,
            maxRetries
          },
          {
            delay: 5 * 60 * 1000, // 5 minutos de espera entre tentativas
            attempts: 1,
            removeOnComplete: true
          }
        );
      } else {
        logger.warn(`[RDS-LID-RETRY] Número máximo de tentativas (${maxRetries}) atingido para contato ${contactId}. Desistindo.`);
      }
      return;
    }

    try {
      // Obter a instância do WhatsApp
      const wbot = await getWbot(whatsappId);

      if (!wbot) {
        throw new Error(`Instância WhatsApp ${whatsappId} não encontrada no wbot`);
      }

      // Formatar o número adequadamente se não terminar com @s.whatsapp.net
      const formattedNumber = number.endsWith("@s.whatsapp.net") ? number : `${number}@s.whatsapp.net`;

      // Fazer a consulta ao WhatsApp
      const ow = wbot.onWhatsApp(formattedNumber);

      if (ow?.[0]?.exists) {
        const lid = ow[0].lid as string;

        if (lid) {
          logger.info(`[RDS-LID-RETRY] LID ${lid} obtido com sucesso para contato ${contactId}`);

          // Verificar e deduplicar contatos
          await checkAndDedup(contact, lid);

          // Criar o mapeamento de LID
          await WhatsappLidMap.findOrCreate({
            where: {
              companyId,
              contactId,
              lid
            },
            defaults: {
              companyId,
              contactId,
              lid
            }
          });

          // Atualizar o campo lid do contato se ainda não estiver preenchido
          if (!contact.lid) {
            await contact.update({ lid });
          }

          logger.info(`[RDS-LID-RETRY] Mapeamento de LID criado/atualizado para contato ${contactId}`);
          return;
        }
      }

      // Se chegou aqui, não conseguiu obter o LID
      logger.warn(`[RDS-LID-RETRY] Não foi possível obter LID para contato ${contactId} (${number})`);

      // Se ainda não atingiu o limite de retentativas, reagendar
      if (retryCount < maxRetries) {
        await lidRetryQueue.add(
          "RetryLidLookup",
          {
            contactId,
            whatsappId,
            companyId,
            number,
            retryCount: retryCount + 1,
            maxRetries
          },
          {
            delay: Math.pow(2, retryCount) * 60 * 1000, // Backoff exponencial (1min, 2min, 4min, 8min, etc)
            attempts: 1,
            removeOnComplete: true
          }
        );

        logger.info(`[RDS-LID-RETRY] Reagendada tentativa ${retryCount + 1} para contato ${contactId}`);
      } else {
        logger.warn(`[RDS-LID-RETRY] Número máximo de tentativas (${maxRetries}) atingido para contato ${contactId}. Desistindo.`);
      }
    } catch (error) {
      logger.error(`[RDS-LID-RETRY] Erro ao processar retentativa para contato ${contactId}: ${error.message}`);

      // Reagendar em caso de erro se não atingiu o limite de retentativas
      if (retryCount < maxRetries) {
        await lidRetryQueue.add(
          "RetryLidLookup",
          {
            contactId,
            whatsappId,
            companyId,
            number,
            retryCount: retryCount + 1,
            maxRetries
          },
          {
            delay: Math.pow(2, retryCount) * 60 * 1000, // Backoff exponencial
            attempts: 1,
            removeOnComplete: true
          }
        );
      }
    }
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`[RDS-LID-RETRY] Erro geral no processador de retentativas: ${err.message}`);
  }
}

export async function startQueueProcess() {
  logger.info("Iniciando processamento de filas");

  messageQueue.process("SendMessage", handleSendMessage);
  // Novo job para envio via API Oficial (Meta)
  messageQueue.process("SendMessageOficial", handleSendMessageOficial);

  scheduleMonitor.process("Verify", handleVerifySchedules);
  scheduleMonitor.process("VerifyReminders", handleVerifyReminders);

  sendScheduledMessages.process("SendMessage", handleSendScheduledMessage);
  sendScheduledMessages.process("SendReminder", handleSendReminder);

  campaignQueue.process("VerifyCampaignsDaatabase", 1, handleVerifyCampaigns);
  campaignQueue.process("ProcessCampaign", 2, handleProcessCampaign);
  campaignQueue.process("PrepareContact", 4, handlePrepareContact);
  campaignQueue.process("DispatchCampaign", 6, handleDispatchCampaign);
  campaignQueue.process("AgentProactiveSequenceTouch", 2, handleAgentProactiveSequenceJob);

  userMonitor.process("VerifyLoginStatus", handleLoginStatus);

  queueMonitor.process("VerifyQueueStatus", handleVerifyQueue);

  lidRetryQueue.process("RetryLidLookup", handleLidRetry);

  if (agentInboundQueue && typeof agentInboundQueue.process === "function") {
    const { handleAgentInboundMessage } = await import("./services/PromptServices/AgentInboundQueueProcessor");
    agentInboundQueue.process("AgentInboundMessage", handleAgentInboundMessage);
  }

  initializeBirthdayJobs();
  initializeAgentProactiveJobs();
  workerContinuo();

  scheduleMonitor.add(
    "Verify",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify" },
      removeOnComplete: true
    }
  );

  // ✅ Adicionar verificação de lembretes
  scheduleMonitor.add(
    "VerifyReminders",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify-reminders" },
      removeOnComplete: true
    }
  );

  campaignQueue.add(
    "VerifyCampaignsDaatabase",
    {},
    {
      repeat: { cron: "*/20 * * * * *", key: "verify-campaing" },
      removeOnComplete: true
    }
  );

  userMonitor.add(
    "VerifyLoginStatus",
    {},
    {
      repeat: { cron: "*/3 * * * *", key: "verify-login" },
      removeOnComplete: true
    }
  );

  queueMonitor.add(
    "VerifyQueueStatus",
    {},
    {
      repeat: { cron: "0 * * * * *", key: "verify-queue" },
      removeOnComplete: true
    }
  );
}

// Handler para envio de mensagens via API Oficial
async function handleSendMessageOficial(job) {
  try {
    const { data } = job;
    const { ticketId, companyId, data: payload } = data;

    // Resolver companyId se não tiver vindo no job
    let companyIdResolved = companyId;
    if (!companyIdResolved) {
      const tk = await Ticket.findByPk(ticketId);
      companyIdResolved = tk?.companyId;
    }

    // Buscar ticket com contexto completo
    const ticket = await ShowTicketService(ticketId, companyIdResolved);

    if (!ticket) {
      throw new Error(`Ticket ${ticketId} não encontrado para envio oficial`);
    }

    // Construir media (se existir) a partir de informações persistidas/URL
    let media: any = null;
    const fsAny = require("fs");
    const pathAny = require("path");

    const publicFolder = pathAny.resolve(__dirname, "..", "public");

    // Caso media previamente salva no public
    if (payload?.mediaFilename) {
      const fullPath = pathAny.join(publicFolder, `company${ticket.companyId}`, payload.mediaFilename);
      media = {
        path: fullPath,
        originalname: payload.mediaOriginalname || payload.mediaFilename,
        mimetype: payload.mediaMimetype || "application/octet-stream",
        filename: payload.mediaFilename
      };
    }

    // Caso seja necessário baixar da URL (indexImage via URL)
    if (!media && payload?.downloadUrl) {
      const axiosAny = require("axios");
      const contentType = payload.mediaMimetype || "image/jpeg";
      const extension = contentType.includes("png")
        ? ".png"
        : contentType.includes("gif")
        ? ".gif"
        : ".jpg";

      const fileName = payload.mediaName || `api-img-${Date.now()}${extension}`;
      const fullPath = pathAny.join(publicFolder, `company${ticket.companyId}`, fileName);

      fsAny.mkdirSync(pathAny.join(publicFolder, `company${ticket.companyId}`), { recursive: true });

      const response = await axiosAny.get(payload.downloadUrl, { responseType: "arraybuffer" });
      fsAny.writeFileSync(fullPath, Buffer.from(response.data));

      media = {
        path: fullPath,
        originalname: fileName,
        mimetype: contentType,
        filename: fileName
      };
    }

    await SendWhatsAppOficialMessage({
      body: payload?.body,
      ticket,
      quotedMsg: null,
      type: payload?.type,
      media,
      vCard: payload?.vCard || null
    });

    // Limpeza de arquivo temporário, se aplicável
    if (media?.path) {
      try {
        if (fsAny.existsSync(media.path)) {
          fsAny.unlinkSync(media.path);
        }
      } catch (err) {
        logger.warn(`Falha ao remover arquivo temporário: ${media.path}`);
      }
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error("MessageQueue -> SendMessageOficial: error", e.message);
    throw e;
  }
}
