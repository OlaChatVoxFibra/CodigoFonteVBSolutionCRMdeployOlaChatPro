/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import QueueIntegrations from "../../models/QueueIntegrations";
import ContactWallet from "../../models/ContactWallet";

const ShowTicketUUIDService = async (
  uuid: string,
  companyId: number,
  requestUserId?: number
): Promise<Ticket> => {
  let requestUser: User | null = null;
  if (requestUserId) {
    requestUser = await User.findByPk(requestUserId);
  }

  const whereCondition: any = { uuid };

  if (!requestUser?.super) {
    whereCondition.companyId = companyId;
  }

  const ticket = await Ticket.findOne({
    where: whereCondition,
    attributes: [
      "id",
      "uuid",
      "queueId",
      "isGroup",
      "channel",
      "status",
      "contactId",
      "useIntegration",
      "lastMessage",
      "updatedAt",
      "unreadMessages",
      "companyId",
      "whatsappId",
      "imported",
      "lgpdAcceptedAt",
      "amountUsedBotQueues",
      "useIntegration",
      "integrationId",
      "userId",
      "amountUsedBotQueuesNPS",
      "lgpdSendMessageAt",
      "isBot"
    ],
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "disableBot", "urlPicture", "companyId", "isGroup", "remoteJid", "lid"],
        include: ["extraInfo", "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          },
          {
            model: ContactWallet,
            include: [
              {
                model: User,
                attributes: ["id", "name"]
              },
              {
                model: Queue,
                attributes: ["id", "name"]
              }
            ]
          }]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "groupAsTicket", "greetingMediaAttachment", "facebookUserToken", "facebookUserId", "color", "wavoip"]
      },
      {
        model: Company,
        as: "company",
        attributes: ["id", "name"]
      },
      {
        model: QueueIntegrations,
        as: "queueIntegration",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  return ticket;
};

export default ShowTicketUUIDService;
