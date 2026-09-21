/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import * as Yup from "yup";
import fs from "fs";
import AppError from "../errors/AppError";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import Message from "../models/Message";
import Whatsapp from "../models/Whatsapp";
import { Op, QueryTypes, Sequelize } from "sequelize";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import SendWhatsAppMedia, { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import { getWbot } from "../libs/wbot";
import SendWhatsAppMessageLink from "../services/WbotServices/SendWhatsAppMessageLink";
import SendWhatsAppMessageAPI from "../services/WbotServices/SendWhatsAppMessageAPI";
import SendWhatsAppMediaImage from "../services/WbotServices/SendWhatsappMediaImage";
import ApiUsages from "../models/ApiUsages";
import { useDate } from "../utils/useDate";
import moment from "moment";
import CompaniesSettings from "../models/CompaniesSettings";
import ShowUserService from "../services/UserServices/ShowUserService";
import { isNil } from "lodash";
import { verifyMediaMessage, verifyMessage } from "../services/WbotServices/wbotMessageListener";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import path from "path";
import Contact from "../models/Contact";
import FindOrCreateATicketTrakingService from "../services/TicketServices/FindOrCreateATicketTrakingService";
import { Mutex } from "async-mutex";
import SendWhatsAppOficialMessage from "../services/WhatsAppOficial/SendWhatsAppOficialMessage";
import MessageApi from "../models/MessageApi";

type WhatsappData = {
  whatsappId: number;
};

export class OnWhatsAppDto {
  constructor(public readonly jid: string, public readonly exists: boolean) { }
}

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  queueId?: number;
  userId?: number;
  sendSignature?: boolean;
  closeTicket?: boolean;
  ignoreTicket?: boolean;
  noRegister?: boolean;
};

interface ContactData {
  number: string;
  isGroup: boolean;
}

const createContact = async (
  whatsappId: number | undefined,
  companyId: number | undefined,
  newContact: string,
  userId?: number | 0,
  queueId?: number | 0,
  wbot?: any
) => {
  try {
    // await CheckIsValidContact(newContact, companyId);

    const validNumber: any = await CheckContactNumber(newContact, companyId, newContact.length > 17);

    const contactData = {
      name: `${validNumber.jid.replace(/\D/g, "")}`,
      number: validNumber.jid.split("@")[0],
      profilePicUrl: "",
      isGroup: false,
      companyId,
      whatsappId,
      remoteJid: validNumber.jid,
      wbot
    };

    const contact = await CreateOrUpdateContactService(contactData);

    const settings = await CompaniesSettings.findOne({
        where: { companyId }
      }
    )    // return contact;

    let whatsapp: Whatsapp | null;

    if (whatsappId === undefined) {
      whatsapp = await GetDefaultWhatsApp(companyId);
    } else {
      whatsapp = await Whatsapp.findByPk(whatsappId);

      if (whatsapp === null) {
        throw new AppError(`whatsapp #${whatsappId} not found`);
      }
    }

    const mutex = new Mutex();
    // Inclui a busca de ticket aqui, se realmente não achar um ticket, então vai para o findorcreate
    const createTicket = await mutex.runExclusive(async () => {
      const ticket = await FindOrCreateTicketService(
        contact,
        whatsapp,
        0,
        companyId,
        queueId,
        userId,
        null,
        whatsapp.channel,
        null,
        false,
        settings,
        false,
        false
      );
      return ticket;
    });

    if (createTicket && createTicket.channel === "whatsapp") {
      SetTicketMessagesAsRead(createTicket);

      await FindOrCreateATicketTrakingService({ ticketId: createTicket.id, companyId, whatsappId: whatsapp.id, userId });

    }

    return createTicket;
  } catch (error) {
    throw new AppError(error.message);
  }
};

function formatBRNumber(jid: string) {
  const regexp = new RegExp(/^(\d{2})(\d{2})\d{1}(\d{8})$/);
  if (regexp.test(jid)) {
    const match = regexp.exec(jid);
    if (match && match[1] === '55' && Number.isInteger(Number.parseInt(match[2]))) {
      const ddd = Number.parseInt(match[2]);
      if (ddd < 31) {
        return match[0];
      } else if (ddd >= 31) {
        return match[1] + match[2] + match[3];
      }
    }
  } else {
    return jid;
  }
}

function createJid(number: string) {
  if (number.includes('@g.us') || number.includes('@s.whatsapp.net')) {
    return formatBRNumber(number) as string;
  }
  return number.includes('-')
    ? `${number}@g.us`
    : `${formatBRNumber(number)}@s.whatsapp.net`;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;

  const { whatsappId }: WhatsappData = req.body;
  const { msdelay }: any = req.body;
  const {
    number,
    body,
    quotedMsg,
    userId,
    queueId,
    sendSignature = false,
    closeTicket = false,
    noRegister = false
  }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const whatsapp = await Whatsapp.findOne({ where: { token } });
  const companyId = whatsapp.companyId;

  newContact.number = newContact.number.replace(" ", "");

  const schema = Yup.object().shape({
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });
  let messageCreated = null;
  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const wbot = await getWbot(whatsapp.id);

  let user
  if (userId?.toString() !== "" && !isNaN(userId)) {
    user = await ShowUserService(userId, companyId);
  }

  let queue
  if (queueId?.toString() !== "" && !isNaN(queueId)) {
    queue = await ShowQueueService(queueId, companyId);
  }

  let bodyMessage;

  // @ts-ignore: Unreachable code error
  if (sendSignature && !isNil(user)) {
    bodyMessage = `*${user.name}:*\n${body ? body.trim() : ''}`
  } else {
    bodyMessage = body ? body.trim() : '';
  }

  const dtschedule = req.body.schedule
    ? new Date(req.body.schedule)
    : await getNextAvailableSchedule(companyId);

  const contactData = {
    name: `${number}`,
    number: number,
    profilePicUrl: "",
    isGroup: false,
    companyId,
    whatsappId,
    remoteJid: number.length > 17 ? `${number}@g.us` : `${number}@s.whatsapp.net`,
    wbot
  };

  const contact = await CreateOrUpdateContactService(contactData);

  if (noRegister) {
    if (medias) {
      try {
        // console.log(medias)
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            const publicFolder = path.resolve(__dirname, "..", "..", "public");
            const filePath = path.join(publicFolder, `company${companyId}`, media.filename);

            const options = await getMessageOptions(media.filename, filePath, companyId.toString(), `\u200e ${bodyMessage}`);
            await wbot.sendMessage(
              `${newContact.number}@${newContact.number.length > 17 ? "g.us" : "s.whatsapp.net"}`,
              options);

            const fileExists = fs.existsSync(filePath);

            if (fileExists) {
              fs.unlinkSync(filePath);
            }
          })
        )
      } catch (error) {
        console.log(medias)
        throw new AppError("Error sending API media: " + error.message);
      }
    } else {
      await wbot.sendMessage(
        `${newContact.number}@${newContact.number.length > 17 ? "g.us" : "s.whatsapp.net"}`,
        {
          text: `\u200e ${bodyMessage}`
        })
    }
  } else {
    const contactAndTicket = await createContact(whatsapp.id, companyId, newContact.number, userId, queueId, wbot);

    let sentMessage

    // Se estiver configurado para API Oficial, envie por ela
    const isOfficial = contactAndTicket?.channel === "whatsapp_oficial";

    if (medias) {
      try {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            if (isOfficial) {
              await SendWhatsAppOficialMessage({
                body: `\u200e ${bodyMessage}`,
                ticket: contactAndTicket,
                quotedMsg: null,
                type: undefined,
                media,
                vCard: null
              });
            } else {
              sentMessage = await SendWhatsAppMedia({ body: `\u200e ${bodyMessage}`, media, ticket: contactAndTicket, isForwarded: false });
            }

            const publicFolder = path.resolve(__dirname, "..", "..", "public");
            const filePath = path.join(publicFolder, `company${companyId}`, media.filename);
            const fileExists = fs.existsSync(filePath);

            if (fileExists) {
              fs.unlinkSync(filePath);
            }
          })
        );
        if (!isOfficial && sentMessage) {
          await verifyMediaMessage(sentMessage, contactAndTicket, contactAndTicket.contact, null, false, false, wbot);
        }
      } catch (error) {
        throw new AppError("Error sending API media: " + error.message);
      }
    } else {
      if (isOfficial) {

        messageCreated = await MessageApi.create({
          companyId,
          contactId: contact.id,
          number: newContact.number,
          body: bodyMessage,
          bodyBase64: bodyMessage,
          userId: userId ? Number(userId) : null,
          queueId: queueId ? Number(queueId) : null,
          sendSignature,
          closeTicket,
          base64: false,
          schedule: dtschedule,
          isSending: false,
          mediaType: null,
          mediaUrl: null,
          whatsappId: whatsapp.id
        });

        /*await SendWhatsAppOficialMessage({
          body: `\u200e${bodyMessage}`,
          ticket: contactAndTicket,
          quotedMsg,
          type: 'text',
          media: null,
          vCard: null
        }); */
      } else {
        messageCreated = await MessageApi.create({
          companyId,
          contactId: contact.id,
          number: newContact.number,
          body: bodyMessage,
          bodyBase64: bodyMessage,
          userId: userId ? Number(userId) : null,
          queueId: queueId ? Number(queueId) : null,
          sendSignature,
          closeTicket,
          base64: false,
          schedule: dtschedule,
          isSending: false,
          mediaType: null,
          mediaUrl: null,
          whatsappId: whatsapp.id
        });
        /*
        sentMessage = await SendWhatsAppMessageAPI({ body: `\u200e${bodyMessage}`, whatsappId: whatsapp.id, contact: contactAndTicket.contact, quotedMsg, msdelay });
        await verifyMessage(sentMessage, contactAndTicket, contactAndTicket.contact)*/
      }

      return res.status(200).json({
        message: "Mensagem enviada a fila de transmissão com sucesso",
        companyId,
        schedule: dtschedule,
        filaId: messageCreated.id
      });
    }
    // @ts-ignore: Unreachable code error
    if (closeTicket) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: contactAndTicket.id,
          ticketData: { status: "closed", sendFarewellMessage: false, amountUsedBotQueues: 0, lastMessage: body },
          companyId,
        });
      }, 100);
    } else if (userId?.toString() !== "" && !isNaN(userId)) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: contactAndTicket.id,
          ticketData: { status: "open", amountUsedBotQueues: 0, lastMessage: body, userId, queueId },
          companyId,
        });
      }, 100);
    }
  }

  setTimeout(async () => {
    const { dateToClient } = useDate();

    const hoje: string = dateToClient(new Date())
    const timestamp = moment().format();

    let exist = await ApiUsages.findOne({
      where: {
        dateUsed: hoje,
        companyId: companyId
      }
    });

    if (exist) {
      if (medias) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            // const type = path.extname(media.originalname.replace('/','-'))

            if (media.mimetype.includes("pdf")) {
              await exist.update({
                usedPDF: exist.dataValues["usedPDF"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else if (media.mimetype.includes("image")) {
              await exist.update({
                usedImage: exist.dataValues["usedImage"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else if (media.mimetype.includes("video")) {
              await exist.update({
                usedVideo: exist.dataValues["usedVideo"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else {
              await exist.update({
                usedOther: exist.dataValues["usedOther"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            }

          })
        )
      } else {
        await exist.update({
          usedText: exist.dataValues["usedText"] + 1,
          UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
          updatedAt: timestamp
        });
      }
    } else {
      exist = await ApiUsages.create({
        companyId: companyId,
        dateUsed: hoje,
      });

      if (medias) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            // const type = path.extname(media.originalname.replace('/','-'))

            if (media.mimetype.includes("pdf")) {
              await exist.update({
                usedPDF: exist.dataValues["usedPDF"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else if (media.mimetype.includes("image")) {
              await exist.update({
                usedImage: exist.dataValues["usedImage"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else if (media.mimetype.includes("video")) {
              await exist.update({
                usedVideo: exist.dataValues["usedVideo"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            } else {
              await exist.update({
                usedOther: exist.dataValues["usedOther"] + 1,
                UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
                updatedAt: timestamp
              });
            }

          })
        )
      } else {
        await exist.update({
          usedText: exist.dataValues["usedText"] + 1,
          UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
          updatedAt: timestamp
        });
      }
    }

  }, 100);

  return res.send({ status: "SUCCESS" });
};

export const indexImage = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;
  const { whatsappId }: WhatsappData = req.body;
  const { msdelay }: any = req.body;
  const url = req.body.url;
  const caption = req.body.caption;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const whatsapp = await Whatsapp.findOne({ where: { token } });
  const companyId = whatsapp.companyId;

  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const contactAndTicket = await createContact(whatsappId, companyId, newContact.number);

  const isOfficial = contactAndTicket?.channel === "whatsapp_oficial";

  if (url) {
    if (isOfficial) {
      try {
        // Baixa a imagem por URL e envia via API Oficial
        const axios = (await import("axios")).default;
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const contentType = response.headers["content-type"] || "image/jpeg";
        const extension = contentType.includes("png") ? ".png" : contentType.includes("jpeg") ? ".jpg" : contentType.includes("jpg") ? ".jpg" : contentType.includes("gif") ? ".gif" : ".jpg";

        const publicFolder = path.resolve(__dirname, "..", "..", "public");
        const fileName = `api-img-${Date.now()}${extension}`;
        const filePath = path.join(publicFolder, `company${companyId}`, fileName);

        // Garante diretório e grava arquivo
        fs.mkdirSync(path.join(publicFolder, `company${companyId}`), { recursive: true });
        fs.writeFileSync(filePath, Buffer.from(response.data));

        const media: any = {
          path: filePath,
          originalname: fileName,
          mimetype: contentType,
          filename: fileName
        };

        await SendWhatsAppOficialMessage({
          body: caption,
          ticket: contactAndTicket,
          quotedMsg: null,
          type: "image",
          media,
          vCard: null
        });

        // Remove arquivo temporário
        const fileExists = fs.existsSync(filePath);
        if (fileExists) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        throw new AppError("Error sending API image by URL (Oficial): " + error.message);
      }
    } else {
      await SendWhatsAppMediaImage({ ticket: contactAndTicket, url, caption, msdelay });
    }
  }

  setTimeout(async () => {
    await UpdateTicketService({
      ticketId: contactAndTicket.id,
      ticketData: { status: "closed", sendFarewellMessage: false, amountUsedBotQueues: 0 },
      companyId
    });
  }, 100);

  setTimeout(async () => {
    const { dateToClient } = useDate();

    const hoje: string = dateToClient(new Date())
    const timestamp = moment().format();

    const exist = await ApiUsages.findOne({
      where: {
        dateUsed: hoje,
        companyId: companyId
      }
    });

    if (exist) {
      await exist.update({
        usedImage: exist.dataValues["usedImage"] + 1,
        UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
        updatedAt: timestamp
      });
    } else {
      const usage = await ApiUsages.create({
        companyId: companyId,
        dateUsed: hoje,
      });

      await usage.update({
        usedImage: usage.dataValues["usedImage"] + 1,
        UsedOnDay: usage.dataValues["UsedOnDay"] + 1,
        updatedAt: timestamp
      });
    }

  }, 100);

  return res.send({ status: "SUCCESS" });
};

export const checkNumber = async (req: Request, res: Response): Promise<Response> => {
  const newContact: ContactData = req.body;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const whatsapp = await Whatsapp.findOne({ where: { token } });
  const companyId = whatsapp.companyId;

  const number = newContact.number.replace("-", "").replace(" ", "");

  const whatsappDefault = await GetDefaultWhatsApp(companyId);
  const wbot = await getWbot(whatsappDefault.id);
  const jid = createJid(number);

  try {
    const [result] = (await wbot.onWhatsApp(jid)) as {
      exists: boolean;
      jid: string;
    }[];

    if (result.exists) {

      setTimeout(async () => {
        const { dateToClient } = useDate();

        const hoje: string = dateToClient(new Date())
        const timestamp = moment().format();

        const exist = await ApiUsages.findOne({
          where: {
            dateUsed: hoje,
            companyId: companyId
          }
        });

        if (exist) {
          await exist.update({
            usedCheckNumber: exist.dataValues["usedCheckNumber"] + 1,
            UsedOnDay: exist.dataValues["UsedOnDay"] + 1,
            updatedAt: timestamp
          });
        } else {
          const usage = await ApiUsages.create({
            companyId: companyId,
            dateUsed: hoje,
          });

          await usage.update({
            usedCheckNumber: usage.dataValues["usedCheckNumber"] + 1,
            UsedOnDay: usage.dataValues["UsedOnDay"] + 1,
            updatedAt: timestamp
          });
        }

      }, 100);

      return res.status(200).json({ existsInWhatsapp: true, number: number, numberFormatted: result.jid });
    }

  } catch (error) {
    return res.status(400).json({ existsInWhatsapp: false, number: jid, error: "Not exists on Whatsapp" });
  }

};

export const indexWhatsappsId = async (req: Request, res: Response): Promise<Response> => {

  return res.status(200).json('oi');
};

async function getNextAvailableSchedule(companyId: number): Promise<Date> {
  // Busca a última mensagem agendada para esta empresa
  const lastScheduledMessage = await MessageApi.findOne({
    where: {
      companyId,
      isSending: false,
      schedule: { [Op.not]: null }
    },
    order: [['schedule', 'DESC']],
    limit: 1
  });

  const now = new Date();

  // Se não há mensagens agendadas ou a última já passou, usa agora + 30 segundos
  if (!lastScheduledMessage || new Date(lastScheduledMessage.schedule) < now) {
    return new Date(now.getTime() + 60 * 1000);
  }

  // Caso contrário, adiciona 30 segundos à última mensagem agendada
  return new Date(new Date(lastScheduledMessage.schedule).getTime() + 60 * 1000);
}
