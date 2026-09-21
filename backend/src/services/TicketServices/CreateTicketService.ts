/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";

import { Op } from "sequelize";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import GetDefaultWhatsAppByUser from "../../helpers/GetDefaultWhatsAppByUser";
import Ticket from "../../models/Ticket";
import ShowContactService from "../ContactServices/ShowContactService";
import { getIO } from "../../libs/socket";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import Queue from "../../models/Queue";
import User from "../../models/User";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";

import CreateLogTicketService from "./CreateLogTicketService";
import ShowTicketService from "./ShowTicketService";

interface Request {
  contactId: number;
  status: string;
  userId: number;
  companyId: number;
  queueId?: number;
  whatsappId: string;
  requestUserId?: number;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  queueId,
  companyId,
  whatsappId = "",
  requestUserId
}: Request): Promise<Ticket> => {

  const io = getIO();

  let whatsapp;
  let defaultWhatsapp

  const normalizedWhatsappId = String(whatsappId || "").trim().toLowerCase();
  if (
    normalizedWhatsappId &&
    normalizedWhatsappId !== "undefined" &&
    normalizedWhatsappId !== "null" &&
    normalizedWhatsappId !== "nan"
  ) {
    // console.log("GETTING WHATSAPP CREATE TICKETSERVICE", whatsappId)
    whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, requestUserId)
  }

  
  defaultWhatsapp = await GetDefaultWhatsAppByUser(userId);

  if (whatsapp) {
    defaultWhatsapp = whatsapp;
  }
  if (!defaultWhatsapp)
    defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  if (!defaultWhatsapp) {
    throw new AppError("ERR_NO_DEF_WAPP_FOUND");
  }

  // console.log("defaultWhatsapp", defaultWhatsapp.id, defaultWhatsapp.channel)
  await CheckContactOpenTickets(contactId, defaultWhatsapp.id);

  const { isGroup } = await ShowContactService(contactId, companyId, requestUserId);

  let ticket = await Ticket.create({
    contactId,
    companyId,
    whatsappId: defaultWhatsapp.id,
    channel: defaultWhatsapp.channel,
    isGroup,
    userId,
    isBot: true,
    queueId,
    status: isGroup ? "group" : "open",
    isActiveDemand: true
  });

  // await Ticket.update(
  //   { companyId, queueId, userId, status: isGroup? "group": "open", isBot: true },
  //   { where: { id } }
  // );

  ticket = await ShowTicketService(ticket.id, companyId, requestUserId);

  if (!ticket) {
    throw new AppError("ERR_CREATING_TICKET");
  }

  io.of(String(companyId))
    // .to(ticket.status)
    // .to("notification")
    // .to(ticket.id.toString())
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });

  await CreateLogTicketService({
    userId,
    queueId,
    ticketId: ticket.id,
    type: "create"
  });

  return ticket;
};

export default CreateTicketService;
