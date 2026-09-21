/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import path from "path";
import fs from "fs";
import { Op, Sequelize } from "sequelize";
import sequelize from "../database";

import CreateService from "../services/ChatService/CreateService";
import ListService from "../services/ChatService/ListService";
import ShowFromUuidService from "../services/ChatService/ShowFromUuidService";
import DeleteService from "../services/ChatService/DeleteService";
import FindMessages from "../services/ChatService/FindMessages";
import UpdateService from "../services/ChatService/UpdateService";

import Chat from "../models/Chat";
import CreateMessageService from "../services/ChatService/CreateMessageService";
import User from "../models/User";
import ChatUser from "../models/ChatUser";
import ChatMessage from "../models/ChatMessage";
import { BelongsTo, ForeignKey } from "sequelize-typescript";
import Company from "../models/Company";
import EditMessageService from "../services/ChatService/EditMessageService";
import DeleteMessageService from "../services/ChatService/DeleteMessageService";
import ForwardMessageService from "../services/ChatService/ForwardMessageService";

const getMediaTypeFromMimeType = (mimetype: string): string => {
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.graphics",
    "application/rtf",
    "text/plain",
    "text/csv",
    "text/html",
    "text/xml",
    "application/xml",
    "application/json",
    "application/ofx",
    "application/vnd.ms-outlook",
    "application/vnd.apple.keynote",
    "application/vnd.apple.numbers",
    "application/vnd.apple.pages",
    "application/x-pkcs12",
    "application/ofx",
    "application/x-msdownload",
    "application/x-executable",
    "application/x-ret"
  ];

  const archiveMimeTypes = [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-bzip2"
  ];

  if (documentMimeTypes.includes(mimetype)) {
    return "document";
  }

  if (archiveMimeTypes.includes(mimetype)) {
    return "document";
  }

  return mimetype.split("/")[0];
};

type IndexQuery = {
  pageNumber: string;
  companyId: string | number;
  ownerId?: number;
};

type StoreData = {
  users: any[];
  title: string;
  isGroup?: boolean;
};

type FindParams = {
  companyId: number;
  ownerId?: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const ownerId = +req.user.id;
  const companyId = +req.user.companyId;

  const { records, count, hasMore } = await ListService({
    ownerId,
    companyId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const ownerId = +req.user.id;
  const data = req.body as StoreData;

  const record = await CreateService({
    ...data,
    ownerId,
    companyId
  });

  const io = getIO();

  record.users.forEach(user => {
    console.log(user.id);
    io.of(String(companyId)).emit(`company-${companyId}-chat-user-${user.id}`, {
      action: "create",
      record
    });
  });

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body;
  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id: +id
  });

  const io = getIO();

  record.users.forEach(user => {
    io.of(String(companyId)).emit(`company-${companyId}-chat-user-${user.id}`, {
      action: "update",
      record,
      userId: user.userId
    });
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowFromUuidService(id);

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId, profile } = req.user;

  // Verificar se o usuário é admin
  if (profile !== "admin") {
    return res.status(403).json({
      error: "Acesso negado. Apenas administradores podem deletar chats."
    });
  }

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-chat`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Chat deleted" });
};

export const saveMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;
  const { message } = req.body;
  const { id } = req.params;
  const senderId = +req.user.id;
  const chatId = +id;

  let newMessage = null;

  if (medias) {
    await Promise.all(
      medias.map(async (media: Express.Multer.File) => {
        newMessage = await CreateMessageService({
          chatId,
          senderId,
          message: media.originalname,
          mediaPath: media.filename,
          mediaName: media.originalname,
          mediaType: getMediaTypeFromMimeType(media.mimetype),
          companyId,
          replyToId: req.body.replyToId
        });
      })
    );
  } else {
    newMessage = await CreateMessageService({
      chatId,
      senderId,
      message,
      companyId,
      replyToId: req.body.replyToId
    });
  }

  const chat = await Chat.findByPk(chatId, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] }
    ]
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-chat-${chatId}`, {
    action: "new-message",
    newMessage,
    chat
  });

  io.of(String(companyId)).emit(`company-${companyId}-chat`, {
    action: "new-message",
    newMessage,
    chat
  });

  return res.json(newMessage);
};

export const checkAsRead = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { userId } = req.body;
  const { id } = req.params;

  const chatUser = await ChatUser.findOne({ where: { chatId: id, userId } });
  await chatUser.update({ unreads: 0 });

  const chat = await Chat.findByPk(id, {
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users" }
    ]
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-chat-${id}`, {
    action: "update",
    chat
  });

  io.of(String(companyId)).emit(`company-${companyId}-chat`, {
    action: "update",
    chat
  });

  return res.json(chat);
};

export const messages = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { pageNumber } = req.query as unknown as IndexQuery;
  const { id: chatId } = req.params;
  const ownerId = +req.user.id;

  const { records, count, hasMore } = await FindMessages({
    chatId,
    ownerId,
    pageNumber
  });

  return res.json({ records, count, hasMore });
};

export const backfillChats = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log("Starting backfillChats process...");
    const companies = await Company.findAll();
    console.log(`Found ${companies.length} companies.`);

    for (const company of companies) {
      console.log(`Processing company: ${company.name} (ID: ${company.id})`);
      const users = await User.findAll({ where: { companyId: company.id } });
      console.log(`Found ${users.length} users in company ${company.id}.`);

      if (users.length < 2) {
        console.log(
          `Skipping company ${company.id}: Not enough users for private chats.`
        );
        continue;
      }

      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          const user1 = users[i];
          const user2 = users[j];
          console.log(
            `Checking chat for pair: User ${user1.id} (${user1.name}) and User ${user2.id} (${user2.name})`
          );

          // NOVA LÓGICA PARA VERIFICAR SE JÁ EXISTE UM CHAT PRIVADO
          // 1. Encontrar todos os IDs de chat associados ao user1
          const chatUsersForUser1 = await ChatUser.findAll({
            attributes: ["chatId"],
            where: { userId: user1.id }
          });
          const user1ChatIds = chatUsersForUser1.map(cu => cu.chatId);
          console.log(`User1 Chat IDs: ${user1ChatIds.join(", ")}`);

          // 2. Encontrar todos os IDs de chat associados ao user2
          const chatUsersForUser2 = await ChatUser.findAll({
            attributes: ["chatId"],
            where: { userId: user2.id }
          });
          const user2ChatIds = chatUsersForUser2.map(cu => cu.chatId);
          console.log(`User2 Chat IDs: ${user2ChatIds.join(", ")}`);

          // 3. Encontrar a intersecção dos IDs de chat
          const commonChatIds = user1ChatIds.filter(id =>
            user2ChatIds.includes(id)
          );
          console.log(`Common Chat IDs: ${commonChatIds.join(", ")}`);

          // 4. Encontrar um chat comum que seja privado e pertença à mesma empresa
          let commonPrivateChat = null;
          if (commonChatIds.length > 0) {
            commonPrivateChat = await Chat.findOne({
              where: {
                id: { [Op.in]: commonChatIds },
                isGroup: false,
                companyId: company.id
              }
            });
            console.log(
              `Found existing common private chat: ${!!commonPrivateChat}`
            );
          }

          if (!commonPrivateChat) {
            console.log(
              `Creating new chat for User ${user1.id} and User ${user2.id}`
            );
            await CreateService({
              ownerId: user1.id,
              companyId: company.id,
              users: [{ id: user1.id }, { id: user2.id }],
              title: "", // Chats privados não precisam de título formal no backend
              isGroup: false
            });
            console.log(
              `Chat created for User ${user1.id} and User ${user2.id}`
            );
          } else {
            console.log(
              `Chat already exists for User ${user1.id} and User ${user2.id}. Skipping.`
            );
          }
        }
      }
    }

    console.log("BackfillChats process finished successfully!");
    return res.status(200).json({ message: "Chats backfilled successfully!" });
  } catch (error) {
    console.error("Error backfilling chats:", error);
    return res.status(500).json({ error: "Failed to backfill chats" });
  }
};

export const editMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { message } = req.body;
  const { companyId } = req.user;
  const userId = +req.user.id;

  const editedMessage = await EditMessageService({
    messageId: +messageId,
    message,
    userId,
    companyId
  });

  return res.json(editedMessage);
};

export const deleteMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const userId = +req.user.id;

  const deletedMessage = await DeleteMessageService({
    messageId: +messageId,
    userId,
    companyId
  });

  return res.json(deletedMessage);
};

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { targetChatId } = req.body;
  const { companyId } = req.user;
  const userId = +req.user.id;

  const forwardedMessage = await ForwardMessageService({
    messageId: +messageId,
    targetChatId: +targetChatId,
    userId,
    companyId
  });

  return res.json(forwardedMessage);
};

export const uploadGroupImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("🖼️ Group image upload - Arquivo processado:", {
    filename: file.filename,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    companyId
  });

  // Retorna o caminho para imagem de grupo: company{id}/groups
  return res.status(200).json({
    fileName: file.filename,
    url: `/public/company${companyId}/groups/${file.filename}`
  });
};


export default {
  index,
  store,
  update,
  show,
  remove,
  saveMessage,
  checkAsRead,
  messages,
  backfillChats,
  editMessage,
  deleteMessage,
  forwardMessage,
  uploadGroupImage
};
