/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import {Request, Response} from "express";
import {getIO} from "../libs/socket";
import {head} from "lodash";
import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import GetContactService from "../services/ContactServices/GetContactService";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import Contact from "../models/Contact";
import Whatsapp from "../models/Whatsapp";
import { syncTelegramContactProfilePic } from "../services/TelegramServices/syncTelegramContactProfilePic";
import { normalizeTelegramContactNumber } from "../utils/normalizeTelegramContactNumber";
import AppError from "../errors/AppError";
import {
  emailSchema,
  phoneSchema,
  nameSchema,
  birthDateSchema,
  searchParamSchema,
  paginationSchema,
  idSchema,
  booleanStringSchema,
  createTextSchema
} from "../validators/commonSchemas";
import {
  sanitizeString,
  sanitizeEmail,
  sanitizePhoneNumber,
  sanitizeText,
  sanitizeNumber
} from "../utils/sanitizers";
import SimpleListService, {
  SearchContactParams
} from "../services/ContactServices/SimpleListService";
import ToggleAcceptAudioContactService from "../services/ContactServices/ToggleAcceptAudioContactService";
import BlockUnblockContactService from "../services/ContactServices/BlockUnblockContactService";
import {ImportContactsService} from "../services/ContactServices/ImportContactsService";
import NumberSimpleListService from "../services/ContactServices/NumberSimpleListService";
import CreateOrUpdateContactServiceForImport from "../services/ContactServices/CreateOrUpdateContactServiceForImport";
import UpdateContactWalletsService from "../services/ContactServices/UpdateContactWalletsService";
import DeleteContactWalletService from "../services/ContactServices/DeleteContactWalletService";
import ListWalletsService from "../services/ContactServices/ListWalletsService";
import FindContactTags from "../services/ContactServices/FindContactTags";
import ToggleDisableBotContactService from "../services/ContactServices/ToggleDisableBotContactService";
import GetGroupParticipantsService from "../services/ContactServices/GetGroupParticipantsService";
import SearchContactMessagesService from "../services/ContactServices/SearchContactMessagesService";
import BulkDeleteContactsService from "../services/ContactServices/BulkDeleteContactsService";
import DeleteAllContactsService from "../services/ContactServices/DeleteAllContactsService";
import GetDefaultWhatsApp from "../helpers/GetDefaultWhatsApp";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import logger from "../utils/logger";
import {createWalletContactUser} from "../services/ContactServices/CreateWalletContactUser";
import User from "../models/User";
import GetContactMediaService from "../services/ContactServices/GetContactMediaService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  contactTag: string;
  isGroup?: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo {
  name: string;
  value: string;
}

interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
  remoteJid?: string;
  wallets?: null | number[] | string[];
  contactWallets?: null | number[] | string[];
  birthDate?: Date | string;
  isGroup?: boolean;
}

export const importXls = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {companyId} = req.user;
  const {number, name, email, validateContact, tags, carteira, birthDate} = req.body;

  try {
    logger.info(`Iniciando importação de contato: ${name} - ${number}`);
    const simpleNumber = String(number).replace(/[^\d.-]+/g, "");
    let validNumber: any = {jid: simpleNumber};

    if (validateContact === "true") {
      try {
        logger.info(`Validando número: ${simpleNumber}`);
        validNumber = await CheckContactNumber(simpleNumber, companyId);
        logger.info(`Número validado com sucesso: ${JSON.stringify(validNumber)}`);
      } catch (validationError) {
        logger.error(`Erro ao validar número ${simpleNumber}:`, validationError);
        validNumber = {jid: simpleNumber};
      }
    } else {
      validNumber = {jid: `${simpleNumber}@s.whatsapp.net`};
      logger.info(`Usando número sem validação: ${validNumber.jid}`);
    }

    let profilePicUrl = "";
    let whatsappId = null;

    try {
      const whatsappPromise = GetDefaultWhatsApp(companyId);
      const profilePicPromise = validNumber.jid ?
        GetProfilePicUrl(validNumber.jid, companyId).catch(err => {
          logger.warn(`Não foi possível obter foto do perfil: ${err.message}`);
          return "";
        }) :
        Promise.resolve("");

      const [defaultWhatsapp, profilePicUrlResult] = await Promise.all([
        whatsappPromise,
        profilePicPromise
      ]);

      profilePicUrl = profilePicUrlResult;
      whatsappId = defaultWhatsapp.id;
      logger.info(`WhatsApp ID obtido: ${whatsappId}`);
    } catch (error) {
      logger.error(`Erro ao obter foto do perfil ou WhatsApp padrão: ${error.message}`);
    }

    // Processar birthDate se fornecido
    let processedBirthDate = null;
    if (birthDate) {
      try {
        // Verificar se é string no formato YYYY-MM-DD
        if (typeof birthDate === 'string' && birthDate.includes('-')) {
          const [year, month, day] = birthDate.split('-').map(Number);
          processedBirthDate = new Date(year, month - 1, day, 12, 0, 0); // Set to midday local time
          if (isNaN(processedBirthDate.getTime())) {
            logger.warn(`Invalid birthDate string provided: ${birthDate}`);
            processedBirthDate = null;
          }
        } else if (birthDate instanceof Date) {
          const year = birthDate.getFullYear();
          const month = birthDate.getMonth();
          const day = birthDate.getDate();
          processedBirthDate = new Date(year, month, day, 12, 0, 0); // Set to midday local time
        }
      } catch (error) {
        logger.error(`Error processing birthDate: ${birthDate}`, error);
        processedBirthDate = null;
      }
    }
    const contactData = {
      name: `${name}`,
      number: validNumber.jid ? validNumber.jid.replace("@s.whatsapp.net", "") : simpleNumber,
      profilePicUrl,
      isGroup: false,
      email,
      companyId,
      whatsappId,
      birthDate: processedBirthDate
    };

    logger.info(`RDS: Criando/atualizando contato: ${JSON.stringify(contactData)}`);
    const contact = await CreateOrUpdateContactServiceForImport(contactData);

    if (tags) {
      const tagList = tags.split(",").map(tag => tag.trim());
      logger.info(`RDS: Processando ${tagList.length} tags para o contato`);

      for (const tagName of tagList) {
        try {
          let [tag, created] = await Tag.findOrCreate({
            where: {name: tagName, companyId, color: "#A4CCCC", kanban: 0}
          });

          await ContactTag.findOrCreate({
            where: {
              contactId: contact.id,
              tagId: tag.id
            }
          });
        } catch (error) {
          logger.error(`RDS: Erro ao criar Tag ${tagName}:`, error);
        }
      }
    }

    if (carteira) {
      try {
        logger.info(`RDS: Processando carteira: ${carteira}`);
        const user = await User.findOne({
          where: {
            email: carteira,
            companyId
          }
        });

        if (user) {
          await createWalletContactUser(contact.id, user.id, null, companyId);
          logger.info(`RDS: Carteira associada com sucesso`);
        } else {
          logger.warn(`RDS: Usuário não encontrado para carteira: ${carteira}`);
        }
      } catch (walletError) {
        logger.error(`RDS: Erro ao processar carteira:`, walletError);
      }
    }

    const io = getIO();

    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });

    return res.status(200).json(contact);
  } catch (error) {
    logger.error(`RDS: Erro ao importar contato ${name} - ${number}:`, error);
    return res.status(500).json({
      error: "RDS: Erro ao importar contato",
      message: error.message || "RDS-206: Erro interno do servidor"
    });
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    searchParam,
    pageNumber,
    contactTag: tagIdsStringified,
    isGroup
  } = req.query as IndexQuery;
  const {id: userId, companyId} = req.user;

  let tagsIds: number[] = [];

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  const {contacts, count, hasMore} = await ListContactsService({
    searchParam,
    pageNumber,
    companyId,
    tagsIds,
    isGroup
  });

  return res.json({contacts, count, hasMore});
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {name, number} = req.body as IndexGetContactQuery;
  const {companyId} = req.user;

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {companyId} = req.user;
  const newContact: ContactData = req.body;
  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers are allowed."),
    email: Yup.string().email("Invalid email"),
    birthDate: Yup.date()
      .nullable()
      .max(new Date(), "Data de nascimento não pode ser no futuro"),
    extraInfo: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required(),
        value: Yup.string().required()
      })
    )
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (!newContact.isGroup) {
    const validNumber = await CheckContactNumber(newContact.number, companyId);
    const number = validNumber.jid.replace(/\D/g, "");
    newContact.number = number;
  }

  const validNumber: any = await CheckContactNumber(
    newContact.number,
    companyId
  );

  const contact = await CreateContactService({
    ...newContact,
    number: validNumber.jid.split("@")[0],
    remoteJid: validNumber.jid,
    companyId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const {companyId, id: requestUserId} = req.user;
  const {contactId} = req.params;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(/^\d+(@lid)?$/, "ERR_CHECK_NUMBER"),
    email: Yup.string().email("Invalid email"),
    birthDate: Yup.date()
      .nullable()
      .max(new Date(), "Data de nascimento não pode ser no futuro"),
    extraInfo: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required(),
        value: Yup.string().required()
      })
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (!contactData.isGroup && contactData.number) {
    const validNumber = await CheckContactNumber(contactData.number, companyId);
    const number = validNumber.jid.replace(/\D/g, "");
    contactData.number = number;
  }

  const oldContact = await ShowContactService(contactId, companyId, Number(requestUserId));

  if (
    contactData.number &&
    oldContact.number != contactData.number &&
    oldContact.channel == "whatsapp"
  ) {
    const isGroup =
      oldContact && oldContact.remoteJid
        ? oldContact.remoteJid.endsWith("@g.us")
        : oldContact.isGroup;
    const validNumber: any = await CheckContactNumber(
      contactData.number,
      companyId,
      isGroup
    );
    const number = validNumber.jid.split("@")[0];
    contactData.number = number;
    contactData.remoteJid = validNumber.jid;
  }

  const contact = await UpdateContactService({
    contactData,
    contactId,
    companyId,
    requestUserId: +requestUserId
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const {contactId} = req.params;
  const {companyId, id: requestUserId} = req.user;

  const contact = await ShowContactService(contactId, companyId, Number(requestUserId));

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;
  const {companyId, id: requestUserId} = req.user;

  await ShowContactService(contactId, companyId, Number(requestUserId));

  await DeleteContactService(contactId);

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId
  });

  return res.status(200).json({message: "Contact deleted"});
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { name, tagId } = req.query as unknown as SearchContactParams & { tagId?: string };
  const { companyId, id: userId } = req.user;

  const contacts = await SimpleListService({
    name,
    companyId,
    userId: Number(userId),
    tagId: tagId ? parseInt(tagId, 10) : undefined
  });

  return res.json(contacts);
};

export const toggleAcceptAudio = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var {contactId} = req.params;
  const {companyId} = req.user;
  const contact = await ToggleAcceptAudioContactService({contactId});

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const blockUnblock = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var {contactId} = req.params;
  const {companyId} = req.user;
  const {active} = req.body;

  const contact = await BlockUnblockContactService({
    contactId,
    companyId,
    active
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const upload = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const file: Express.Multer.File = head(files) as Express.Multer.File;
  const {companyId} = req.user;

  const response = await ImportContactsService(companyId, file);

  const io = getIO();

  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "reload",
    records: response
  });

  return res.status(200).json(response);
};

export const getContactProfileURL = async (req: Request, res: Response) => {
  const {number} = req.params;
  const {companyId} = req.user;
  const channel = String(req.query.channel || "whatsapp").toLowerCase();
  const whatsappIdRaw = req.query.whatsappId;
  const whatsappId =
    whatsappIdRaw != null && String(whatsappIdRaw).trim() !== ""
      ? Number(whatsappIdRaw)
      : undefined;

  if (!number) {
    return res.status(200).json({ contactId: 0, profilePicUrl: "" });
  }

  const isTelegramChannel =
    channel === "telegram" || channel === "telegram_oficial";
  const cleanNumber = isTelegramChannel
    ? normalizeTelegramContactNumber(number)
    : String(number).replace(/\D/g, "") || String(number).trim();

  if (isTelegramChannel) {
    let contact = await Contact.findOne({
      where: { number: cleanNumber, companyId, channel }
    });

    const connection =
      whatsappId && !Number.isNaN(whatsappId)
        ? await Whatsapp.findOne({
            where: { id: whatsappId, companyId, channel }
          })
        : await Whatsapp.findOne({
            where: { companyId, channel, status: "CONNECTED" },
            order: [["id", "DESC"]]
          });

    if (contact && connection) {
      try {
        contact = await syncTelegramContactProfilePic({
          connection,
          contact,
          chatId: cleanNumber,
          userId:
            !contact.isGroup && /^-?\d+$/.test(cleanNumber)
              ? Number(cleanNumber)
              : undefined,
          isGroup: !!contact.isGroup,
          force: channel === "telegram_oficial"
        });
      } catch {
        /* mantém avatar atual */
      }
    }

    const profilePicUrl = contact?.profilePicUrl || "";
    const urlPicture = contact?.urlPicture || "";
    return res.status(200).json({
      contactId: contact?.id || 0,
      profilePicUrl,
      urlPicture
    });
  }

  const validNumber: any = await CheckContactNumber(number, companyId);
  let profilePicUrl = "";
  try {
    profilePicUrl = await GetProfilePicUrl(validNumber.jid, companyId);
  } catch (error) {
    profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  }

  const contact = await NumberSimpleListService({
    number: validNumber.jid.split("@")[0],
    companyId: companyId
  });

  let obj: any;
  if (contact.length > 0) {
    obj = {
      contactId: contact[0].id,
      profilePicUrl: profilePicUrl,
      urlPicture: contact[0].urlPicture || ""
    };
  } else {
    obj = {
      contactId: 0,
      profilePicUrl: profilePicUrl
    };
  }
  return res.status(200).json(obj);
};

export const getContactVcard = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {name, number} = req.query as IndexGetContactQuery;
  const {companyId} = req.user;

  let vNumber = number;
  const numberDDI = vNumber.toString().substr(0, 2);
  const numberDDD = vNumber.toString().substr(2, 2);
  const numberUser = vNumber.toString().substr(-8, 8);

  if (numberDDD <= "30" && numberDDI === "55") {
    console.log("menor 30");
    vNumber = `${numberDDI + numberDDD + 9 + numberUser}@s.whatsapp.net`;
  } else if (numberDDD > "30" && numberDDI === "55") {
    console.log("maior 30");
    vNumber = `${numberDDI + numberDDD + numberUser}@s.whatsapp.net`;
  } else {
    vNumber = `${number}@s.whatsapp.net`;
  }

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const getContactTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;

  const contactTags = await FindContactTags({contactId});

  let tags = false;

  if (contactTags.length > 0) {
    tags = true;
  }

  return res.status(200).json({tags: tags});
};

export const toggleDisableBot = async (
  req: Request,
  res: Response
): Promise<Response> => {
  var {contactId} = req.params;
  const {companyId} = req.user;
  const contact = await ToggleDisableBotContactService({contactId});

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const updateContactWallet = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {wallets} = req.body;
  const {contactId} = req.params;
  const {companyId} = req.user;

  const userId = wallets.userId;
  const queueId = wallets.queueId;

  const contact = await UpdateContactWalletsService({
    userId,
    queueId,
    contactId,
    companyId
  });

  return res.status(200).json(contact);
};

export const deleteContactWallet = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;
  const {companyId} = req.user;

  const contact = await DeleteContactWalletService({
    contactId,
    companyId
  });

  return res.status(200).json(contact);
};

export const listWhatsapp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {name} = req.query as unknown as SearchContactParams;
  const {companyId} = req.user;

  const contactsAll = await SimpleListService({name, companyId});

  const contacts = contactsAll.filter(contact => contact.channel == "whatsapp");

  return res.json(contacts);
};

export const listWallets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {searchParam, pageNumber, userId} = req.query as any;
  const {companyId} = req.user;

  const wallets = await ListWalletsService({
    searchParam,
    pageNumber,
    userId,
    companyId
  });

  return res.json(wallets);
};

export const getContactMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;
  const {companyId} = req.user;

  const media = await GetContactMediaService({
    contactId: Number(contactId),
    companyId
  });

  return res.status(200).json(media);
};

export const getGroupParticipants = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;
  const {companyId} = req.user;

  try {
    const participants = await GetGroupParticipantsService({
      contactId: Number(contactId),
      companyId
    });

    return res.status(200).json(participants);
  } catch (error) {
    logger.error("Erro ao buscar participantes do grupo:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message
    });
  }
};

export const searchMessages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {contactId} = req.params;
  const {searchParam, pageNumber} = req.query as {
    searchParam: string;
    pageNumber?: string;
  };
  const {companyId} = req.user;

  if (!searchParam || searchParam.trim().length < 2) {
    return res.status(400).json({
      error: "Parâmetro de busca deve ter pelo menos 2 caracteres"
    });
  }

  try {
    const {messages, count, hasMore} = await SearchContactMessagesService({
      contactId: Number(contactId),
      companyId,
      searchParam: searchParam.trim(),
      pageNumber
    });

    return res.status(200).json({
      messages,
      count,
      hasMore
    });
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const bulkDelete = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const bulkDeleteSchema = Yup.object().shape({
    contactIds: Yup.array()
      .of(idSchema.required("Contact ID is required"))
      .min(1, "At least one contact ID is required")
      .max(500, "Maximum 500 contacts can be deleted at once")
      .required("Contact IDs array is required")
  });

  try {
    const {contactIds} = await bulkDeleteSchema.validate(req.body);
    const {companyId} = req.user;

    const sanitizedIds = contactIds.map(id => sanitizeNumber(id)).filter(id => id > 0);

    if (sanitizedIds.length === 0) {
      throw new AppError("No valid contact IDs provided", 400);
    }

    const deletedCount = await BulkDeleteContactsService({
      contactIds: sanitizedIds,
      companyId
    });

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
      action: "bulk-delete",
      contactIds: sanitizedIds,
      deletedCount
    });

    return res.status(200).json({
      message: `${deletedCount} contacts deleted successfully`,
      deletedCount,
      contactIds: sanitizedIds
    });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      throw new AppError(`Validation error: ${err.message}`, 400);
    }
    throw err;
  }
};

export const deleteAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const deleteAllSchema = Yup.object().shape({
    confirmation: Yup.string()
      .required("Confirmation is required")
      .matches(/^DELETE_ALL_CONTACTS$/, "Invalid confirmation string"),
    excludeIds: Yup.array()
      .of(idSchema)
      .nullable()
  });

  try {
    const validatedData = await deleteAllSchema.validate(req.body);
    const {companyId} = req.user;
    const {excludeIds = []} = validatedData;

    const sanitizedExcludeIds = excludeIds.map(id => sanitizeNumber(id)).filter(id => id > 0);

    const deletedCount = await DeleteAllContactsService({
      companyId,
      excludeIds: sanitizedExcludeIds
    });

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-contact`, {
      action: "delete-all",
      deletedCount,
      excludeIds: sanitizedExcludeIds
    });

    return res.status(200).json({
      message: `${deletedCount} contacts deleted successfully`,
      deletedCount
    });
  } catch (err: any) {
    if (err.name === 'ValidationError') {
      throw new AppError(`Validation error: ${err.message}`, 400);
    }
    throw err;
  }
};
