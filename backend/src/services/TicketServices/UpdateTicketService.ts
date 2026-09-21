/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import * as Sentry from "@sentry/node";
import { Op } from "sequelize";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import { isNil } from "lodash";
import { sendFacebookMessage } from "../FacebookServices/sendFacebookMessage";
import { verifyMessageFace } from "../FacebookServices/facebookMessageListener";
import ShowUserService from "../UserServices/ShowUserService";
import User from "../../models/User";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateLogTicketService from "./CreateLogTicketService";
import TicketTag from "../../models/TicketTag";
import Tag from "../../models/Tag";
import CreateMessageService from "../MessageServices/CreateMessageService";
import FindOrCreateTicketService from "./FindOrCreateTicketService";
import formatBody from "../../helpers/Mustache";
import { Mutex } from "async-mutex";
import { getJidOf } from "../WbotServices/getJidOf";
import logger from "../../utils/logger";
import ListUserQueueImmediateService from "../UserQueueServices/ListUserQueueImmediateService";
import { shouldAutoAssignOnTransfer } from "../../helpers/transferAutoAssign";
import SendWhatsAppOficialMessage from "../WhatsAppOficial/SendWhatsAppOficialMessage";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import {
  humanAcceptTicketFlags,
  isManualTicketAccept
} from "../../helpers/ticketHumanAccept";

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  /** Ao transferir, opcionalmente mudar a conexão WhatsApp do ticket */
  whatsappId?: number | null | string;
  isBot?: boolean;
  queueOptionId?: number;
  sendFarewellMessage?: boolean;
  amountUsedBotQueues?: number;
  lastMessage?: string;
  integrationId?: number;
  useIntegration?: boolean;
  unreadMessages?: number;
  msgTransfer?: string;
  isTransfered?: boolean;
  valorVenda?: number;
  motivoNaoVenda?: string;
  motivoFinalizacao?: string;
  finalizadoComVenda?: boolean;
  flowWebhook?: boolean;
  flowStopped?: boolean;
  dataWebhook?: any;
  lastFlowId?: string;
  hashFlowId?: string;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
  requestUserId?: number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId,
  requestUserId
}: Request): Promise<Response> => {
  try {
    let {
      queueId,
      userId,
      whatsappId: ticketWhatsappIdOverride,
      sendFarewellMessage = true,
      amountUsedBotQueues,
      lastMessage,
      integrationId,
      useIntegration,
      unreadMessages,
      msgTransfer,
      isTransfered = false,
      status,
      valorVenda,
      motivoNaoVenda,
      motivoFinalizacao,
      finalizadoComVenda,
      dataWebhook: ticketDataWebhookPatch
    } = ticketData;
    let isBot: boolean | null | undefined =
      ticketData.isBot !== undefined ? ticketData.isBot : undefined;
    let queueOptionId: number | null = ticketData.queueOptionId || null;
    const shouldSendFarewellMessage =
      sendFarewellMessage || sendFarewellMessage === undefined;
    const farewellRequestedExplicitly = ticketData.sendFarewellMessage === true;

    const io = getIO();

    const settings = await CompaniesSettings.findOne({
      where: {
        companyId: companyId
      }
    });

    let requestUser: User | null = null;
    if (requestUserId) {
      requestUser = await User.findByPk(requestUserId);
    }

    const whereCondition: any = { id: ticketId };
    
    if (!requestUser?.super) {
      whereCondition.companyId = companyId;
    }

    let ticket = await Ticket.findOne({
      where: whereCondition,
      include: [
        {
          model: Contact,
          as: "contact",
          include: [
            "extraInfo",
            "tags",
            {
              association: "wallets",
              attributes: ["id", "name"]
            },
          ]
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "name"]
        },
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name", "color"]
        },
        {
          model: Whatsapp,
          as: "whatsapp",
          attributes: ["id", "name", "groupAsTicket", "greetingMediaAttachment", "facebookUserToken", "facebookUserId", "status", "color", "wavoip"]
        }
      ]
    });

    if (!ticket) {
      throw new AppError("ERR_NO_TICKET_FOUND", 404);
    }

    if (isBot === undefined) {
      isBot = ticket.isBot;
    }

    if (ticket.channel === "whatsapp" && ticket.whatsappId) {
      SetTicketMessagesAsRead(ticket);
    }

    const oldStatus = ticket?.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket?.queueId;
    let transferWhatsapp: Whatsapp = ticket.whatsapp;
    let resolvedTransferWhatsappId: number | undefined;

    if (ticketWhatsappIdOverride !== undefined && ticketWhatsappIdOverride !== null) {
      const wid = Number(ticketWhatsappIdOverride);
      if (Number.isFinite(wid) && wid > 0 && wid !== ticket.whatsappId) {
        const whatsappTarget = await Whatsapp.findOne({
          where: { id: wid, companyId: ticket.companyId }
        });
        if (!whatsappTarget) {
          throw new AppError("ERR_NO_WAPP_FOUND", 404);
        }
        if (whatsappTarget.channel !== ticket.channel) {
          throw new AppError("ERR_TRANSFER_CONNECTION_TYPE_MISMATCH", 400);
        }
        transferWhatsapp = whatsappTarget;
        resolvedTransferWhatsappId = wid;
      }
    }

    if (isNil(ticket.whatsappId) && status === "closed") {
      await CreateLogTicketService({
        userId,
        queueId: ticket.queueId,
        ticketId,
        type: "closed"
      });

      await ticket.update({
        status: "closed",
        useIntegration: null,
        integrationId: null
      });

      io.of(String(ticket.companyId))
        // .to(oldStatus)
        // .to(ticketId.toString())
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
      return { ticket, oldStatus, oldUserId };
    }

    if (oldStatus === "closed") {
      let otherTicket = await Ticket.findOne({
        where: {
          contactId: ticket.contactId,
          status: { [Op.or]: ["open", "pending", "group"] },
          whatsappId: ticket.whatsappId
        }
      });
      if (otherTicket) {
        if (otherTicket.id !== ticket.id) {
          otherTicket = await ShowTicketService(otherTicket.id, companyId, requestUserId);
          return { ticket: otherTicket, oldStatus, oldUserId };
        }
      }

      // await CheckContactOpenTickets(ticket.contactId, ticket.whatsappId );
      isBot = false;
    }

    // Aceitar (pending → open/group): desliga agente e integração neste ticket
    if (
      isManualTicketAccept({
        status,
        userId,
        oldStatus,
        oldUserId,
        explicitIsBot: ticketData.isBot
      })
    ) {
      logger.info(
        `[TICKET ACCEPTED] Ticket ${ticketId} aceito por usuário ${userId} - desativando agente/integração`
      );
      const acceptFlags = humanAcceptTicketFlags();
      isBot = acceptFlags.isBot;
      useIntegration = acceptFlags.useIntegration;
      integrationId = acceptFlags.integrationId;
    }

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket?.whatsappId,
      userId: ticket.userId
    });
    // console.log("GETTING WHATSAPP UPDATE TICKETSERVICE", ticket?.whatsappId)
    const {
      complationMessage,
      farewellMessage: whatsappFarewellMessage,
      ratingMessage,
      groupAsTicket,
      status: whatsappStatus,
      sendFarewellMessage: whatsappSendFarewellMessage
    } =
      await ShowWhatsAppService(
        ticket?.whatsappId,
        companyId,
        undefined,
        requestUserId
      );

    const effectiveShouldSendFarewellMessage =
      ticketData.sendFarewellMessage === false
        ? false
        : whatsappSendFarewellMessage === false
          ? false
          : shouldSendFarewellMessage;

    if (status !== undefined && ["closed"].indexOf(status) > -1) {
      const _userId = ticket.userId || userId;
      let user;
      if (_userId) {
        user = await User.findByPk(_userId);
      }

      if (
        settings.userRating === "enabled" &&
        shouldSendFarewellMessage &&
        !isNil(ratingMessage) &&
        ratingMessage !== "" &&
        !ticket.isGroup
      ) {
        if (ticketTraking.ratingAt == null) {
          const ratingTxt = ratingMessage || "";
          let bodyRatingMessage = `\u200e ${ratingTxt}\n`;

          if (
            ticket.channel === "whatsapp" &&
            whatsappStatus === "CONNECTED"
          ) {
            const msg = await SendWhatsAppMessage({
              body: bodyRatingMessage,
              ticket,
              isForwarded: false
            });
            await verifyMessage(msg, ticket, ticket.contact, undefined, false, false, true);
          } else if (["facebook", "instagram"].includes(ticket.channel)) {
            const msg = await sendFacebookMessage({
              body: bodyRatingMessage,
              ticket
            });
            await verifyMessageFace(
              msg,
              bodyRatingMessage,
              ticket,
              ticket.contact
            );
          } else if (ticket.channel === "whatsapp_oficial") {
            await SendWhatsAppOficialMessage({
              body: bodyRatingMessage,
              ticket: ticket,
              quotedMsg: null,
              type: 'text',
              media: null,
              vCard: null
            });
          }

          await ticketTraking.update({
            userId: ticket.userId,
            closedAt: moment().toDate()
          });

          await CreateLogTicketService({
            userId: ticket.userId,
            queueId: ticket.queueId,
            ticketId,
            type: "nps"
          });

          // try {
          //   // Retrieve tagIds associated with the provided ticketId from TicketTags
          //   const ticketTags = await TicketTag.findAll({ where: { ticketId } });
          //   const tagIds = ticketTags.map((ticketTag) => ticketTag.tagId);

          //   // Find the tagIds with kanban = 1 in the Tags table
          //   const tagsWithKanbanOne = await Tag.findAll({
          //     where: {
          //       id: tagIds,
          //       kanban: 1,
          //     },
          //   });

          //   // Remove the tagIds with kanban = 1 from TicketTags
          //   const tagIdsWithKanbanOne = tagsWithKanbanOne.map((tag) => tag.id);
          //   if (tagIdsWithKanbanOne)
          //     await TicketTag.destroy({ where: { ticketId, tagId: tagIdsWithKanbanOne } });
          // } catch (error) {
          //   Sentry.captureException(error);
          // }

          await ticket.update({
            status: "nps",
            amountUsedBotQueuesNPS: 1
          });

          io.of(String(companyId))
            // .to(oldStatus)
            // .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          return { ticket, oldStatus, oldUserId };
        }
      }

      if (
        ((!isNil(user?.farewellMessage) && user?.farewellMessage !== "") ||
          (!isNil(complationMessage) && complationMessage !== "") ||
          (!isNil(whatsappFarewellMessage) && whatsappFarewellMessage !== "")) &&
        effectiveShouldSendFarewellMessage
      ) {
        let body: any;

        if (
          ticket.status !== "pending" ||
          farewellRequestedExplicitly ||
          (ticket.status === "pending" &&
            settings.sendFarewellWaitingTicket === "enabled")
        ) {
          if (
            !isNil(user) &&
            !isNil(user?.farewellMessage) &&
            user?.farewellMessage !== ""
          ) {
            body = `\u200e ${user.farewellMessage}`;
          } else if (!isNil(complationMessage) && complationMessage !== "") {
            body = `\u200e ${complationMessage}`;
          } else {
            body = `\u200e ${whatsappFarewellMessage}`;
          }
          if (
            ticket.channel === "whatsapp" &&
            (!ticket.isGroup || groupAsTicket === "enabled") &&
            whatsappStatus === "CONNECTED"
          ) {
            const sentMessage = await SendWhatsAppMessage({
              body,
              ticket,
              isForwarded: false
            });

            await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, false);
          }

          if (
            ["facebook", "instagram"].includes(ticket.channel) &&
            (!ticket.isGroup || groupAsTicket === "enabled")
          ) {
            const sentMessage = await sendFacebookMessage({ body, ticket });

            // await verifyMessageFace(sentMessage, body, ticket, ticket.contact );
          }

          if (ticket.channel === "whatsapp_oficial") {
            await SendWhatsAppOficialMessage({
              body: body,
              ticket: ticket,
              quotedMsg: null,
              type: 'text',
              media: null,
              vCard: null
            });
          }
          
        }
      }

      ticketTraking.finishedAt = moment().toDate();
      ticketTraking.closedAt = moment().toDate();
      ticketTraking.whatsappId = ticket?.whatsappId;
      ticketTraking.userId = ticket.userId;

      // queueId = null;
      // userId = null;
      //loga fim de atendimento
      await CreateLogTicketService({
        userId,
        queueId: ticket.queueId,
        ticketId,
        type: "closed"
      });

      // try {
      //   // Retrieve tagIds associated with the provided ticketId from TicketTags
      //   const ticketTags = await TicketTag.findAll({ where: { ticketId } });
      //   const tagIds = ticketTags.map((ticketTag) => ticketTag.tagId);

      //   // Find the tagIds with kanban = 1 in the Tags table
      //   const tagsWithKanbanOne = await Tag.findAll({
      //     where: {
      //       id: tagIds,
      //       kanban: 1,
      //     },
      //   });

      //   // Remove the tagIds with kanban = 1 from TicketTags
      //   const tagIdsWithKanbanOne = tagsWithKanbanOne.map((tag) => tag.id);
      //   if (tagIdsWithKanbanOne)
      //     await TicketTag.destroy({ where: { ticketId, tagId: tagIdsWithKanbanOne } });
      // } catch (error) {
      //   Sentry.captureException(error);
      // }

      await ticketTraking.save();

      await ticket.update({
        status: "closed",
        isBot: false,
        lastFlowId: null,
        dataWebhook: null,
        hashFlowId: null,
        valorVenda,
        motivoNaoVenda,
        motivoFinalizacao,
        useIntegration: null,
        integrationId: null,
        amountUsedBotQueues: 0,
        amountUsedBotQueuesNPS: 0,
        finalizadoComVenda:
          finalizadoComVenda === undefined || finalizadoComVenda === null
            ? false
            : finalizadoComVenda
      });

      const refreshed = await ShowTicketService(ticket.id, companyId, requestUserId);
      io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket: refreshed
      });
      return { ticket: refreshed, oldStatus, oldUserId };
    }
    let queue;
    if (!isNil(queueId)) {
      queue = await Queue.findByPk(queueId);
      ticketTraking.queuedAt = moment().toDate();
    }

    // ✅ CORRIGIDO: NUNCA randomizar quando isTransfered = true (transferência manual)
    // A randomização automática só deve ocorrer em OUTROS fluxos, não em transferências
    const allowQueueAutoAssign = shouldAutoAssignOnTransfer({
      isTransfered,
      userId,
      oldQueueId,
      newQueueId: queueId
    });

    if (allowQueueAutoAssign && !isNil(queueId) && queue) {
      // Só aplicar randomização se NÃO for uma transferência E não há usuário fornecido
      if (isNil(userId) && queue.randomizeImmediate && queue.ativarRoteador) {
        logger.info(
          `[AUTO ASSIGN] Aplicando randomização imediata da fila ${queueId}`,
          { ticketId, queueId, oldQueueId }
        );

        try {
          const randomizationResult = await ListUserQueueImmediateService(queueId, Number(ticketId));

          if (randomizationResult && randomizationResult.userId) {
            userId = randomizationResult.userId;

            logger.info(
              `[AUTO ASSIGN] Usuário atribuído pela randomização imediata`,
              {
                ticketId,
                queueId,
                newUserId: userId,
                typeRandomMode: queue.typeRandomMode
              }
            );

            // Se um usuário foi atribuído pela randomização, o status deve ser "open" (ou "group" para grupos)
            if (!isNil(userId)) {
              status = ticket.isGroup ? "group" : "pending";
            }
          }
        } catch (error) {
          logger.error(
            `[AUTO ASSIGN] Erro ao aplicar randomização imediata`,
            { ticketId, queueId, error: error.message }
          );
        }
      }
    }

    // Log para transferências manuais
    if (isTransfered) {
      logger.info(
        `[TICKET TRANSFER] Transferência manual - IGNORANDO randomização automática`,
        {
          ticketId,
          queueId,
          userId: userId || 'null (sem usuário específico)',
          isTransfered
        }
      );
    }

    if (isTransfered) {
      if (settings.closeTicketOnTransfer) {
        let newTicketTransfer = ticket;
        if (oldQueueId !== queueId || resolvedTransferWhatsappId) {
          await ticket.update({
            status: "closed",
            useIntegration: null,
            integrationId: null
          });

          await ticket.reload();

          io.of(String(companyId))
            // .to(oldStatus)
            // .to(ticketId.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          newTicketTransfer = await FindOrCreateTicketService(
            ticket.contact,
            transferWhatsapp,
            1,
            ticket.companyId,
            queueId,
            userId,
            null,
            ticket.channel,
            false,
            false,
            settings,
            isTransfered
          );

          await FindOrCreateATicketTrakingService({
            ticketId: newTicketTransfer.id,
            companyId,
            whatsappId: transferWhatsapp.id,
            userId
          });
        }

        if (!isNil(msgTransfer)) {
          const messageData = {
            wid: `PVT${newTicketTransfer.updatedAt
              .toString()
              .replace(" ", "")}`,
            ticketId: newTicketTransfer.id,
            contactId: undefined,
            body: msgTransfer,
            fromMe: true,
            mediaType: "extendedTextMessage",
            read: true,
            quotedMsgId: null,
            ack: 2,
            remoteJid: newTicketTransfer.contact?.remoteJid,
            participant: null,
            dataJson: null,
            ticketTrakingId: null,
            isPrivate: true
          };

          await CreateMessageService({
            messageData,
            companyId: ticket.companyId
          });
        }

        const closeOnTransferUpdate: Record<string, unknown> = {
          queueId,
          userId,
          status
        };
        if (resolvedTransferWhatsappId) {
          closeOnTransferUpdate.whatsappId = resolvedTransferWhatsappId;
        }
        await newTicketTransfer.update(closeOnTransferUpdate);

        await newTicketTransfer.reload();

        if (resolvedTransferWhatsappId) {
          await ticketTraking.update({
            whatsappId: resolvedTransferWhatsappId
          });
        }

        if (settings.sendMsgTransfTicket === "enabled") {
          // Mensagem de transferencia da FILA
          if (
            (oldQueueId !== queueId || oldUserId !== userId) &&
            !isNil(oldQueueId) &&
            !isNil(queueId) &&
            !isNil(queueId) &&
            ticket.whatsapp.status === "CONNECTED"
          ) {

            const msgtxt = formatBody(
              `\u200e ${settings.transferMessage.replace(
                "${queue.name}",
                queue?.name
              )}`,
              ticket
            );

            if (msgtxt.length > 0) {

              if (ticket.channel === "whatsapp") {
                const wbot = await GetTicketWbot(ticket);
                const queueChangedMessage = await wbot.sendMessage(
                  getJidOf(ticket),
                  {
                    text: msgtxt
                  }
                );

                await verifyMessage(
                  queueChangedMessage,
                  ticket,
                  ticket.contact,
                  ticketTraking,
                  false,
                  false,
                  true
                );
              }

              if (ticket.channel === "whatsapp_oficial") {
                await SendWhatsAppOficialMessage({
                  body: msgtxt,
                  ticket: ticket,
                  quotedMsg: null,
                  type: 'text',
                  media: null,
                  vCard: null
                });
              }
            }

          }
          // else
          //   // Mensagem de transferencia do ATENDENTE
          //   if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId) && (!ticket.isGroup || groupAsTicket === "enabled")) {
          //     const wbot = await GetTicketWbot(ticket);
          //     const nome = await ShowUserService(ticketData.userId, companyId);
          //     const msgtxt = `\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o atendente *${nome.name}*\nAguarde um momento, iremos atende-lo(a)!`;

          //     const queueChangedMessage = await wbot.sendMessage(
          //       `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //       {
          //         text: msgtxt
          //       }
          //     );
          //     await verifyMessage(queueChangedMessage, ticket, ticket.contact, ticketTraking);
          //   }
          //   else
          //     // Mensagem de transferencia do ATENDENTE e da FILA
          //     if (oldUserId !== userId && oldQueueId !== queueId && !isNil(oldUserId) && !isNil(userId) && (!ticket.isGroup || groupAsTicket === "enabled")) {
          //       const wbot = await GetTicketWbot(ticket);
          //       const nome = await ShowUserService(ticketData.userId, companyId);
          //       const msgtxt = `\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *${queue?.name}* e será atendido por *${nome.name}*\nAguarde um momento, iremos atende-lo(a)!`;

          //       const queueChangedMessage = await wbot.sendMessage(
          //         `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //         {
          //           text: msgtxt
          //         }
          //       );
          //       await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          //     } else
          //       if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

          //         const wbot = await GetTicketWbot(ticket);
          //         const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *" + queue?.name + "*\nAguarde um momento, iremos atende-lo(a)!";

          //         const queueChangedMessage = await wbot.sendMessage(
          //           `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //           {
          //             text: msgtxt
          //           }
          //         );
          //         await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          //       }
        }

        if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para fila
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para atendente na mesma fila
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          //recebeu atendimento
          await CreateLogTicketService({
            userId,
            queueId: oldQueueId,
            ticketId: newTicketTransfer.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId !== queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para fila e atendente

          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          //recebeu atendimento
          await CreateLogTicketService({
            userId,
            queueId,
            ticketId: newTicketTransfer.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== undefined &&
          isNil(userId) &&
          oldQueueId !== queueId &&
          !isNil(queueId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        }

        if (
          newTicketTransfer.status !== oldStatus ||
          newTicketTransfer.user?.id !== oldUserId
        ) {
          await ticketTraking.update({
            userId: newTicketTransfer.userId
          });
          // console.log("emitiu socket 497", ticket.id, newTicketTransfer.id)
          io.of(String(companyId))
            // .to(oldStatus)
            .emit(`company-${companyId}-ticket`, {
              action: "delete",
              ticketId: newTicketTransfer.id
            });
        }

        io.of(String(companyId))
          // .to(newTicketTransfer.status)
          // .to("notification")
          // .to(newTicketTransfer.id.toString())
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket: newTicketTransfer
          });

        return { ticket: newTicketTransfer, oldStatus, oldUserId };
      } else {
        if (settings.sendMsgTransfTicket === "enabled") {
          // Mensagem de transferencia da FILA
          if (
            oldQueueId !== queueId ||
            (oldUserId !== userId &&
              !isNil(oldQueueId) &&
              !isNil(queueId) &&
              ticket.whatsapp.status === "CONNECTED")
          ) {

            const msgtxt = formatBody(
              `\u200e ${settings.transferMessage.replace(
                "${queue.name}",
                queue?.name
              )}`,
              ticket
            );
            // const msgtxt = `\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *${queue?.name}"*\nAguarde um momento, iremos atende-lo(a)!`;

            if (msgtxt.length > 0) {

              if (ticket.channel === "whatsapp") {
                const wbot = await GetTicketWbot(ticket);
                const queueChangedMessage = await wbot.sendMessage(
                  `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                  }`,
                  {
                    text: msgtxt
                  }
                );
                await verifyMessage(
                  queueChangedMessage,
                  ticket,
                  ticket.contact,
                  ticketTraking,
                  false,
                  false,
                  true
                );
              }

              if (ticket.channel === "whatsapp_oficial") {
                await SendWhatsAppOficialMessage({
                  body: msgtxt,
                  ticket: ticket,
                  quotedMsg: null,
                  type: 'text',
                  media: null,
                  vCard: null
                });
              }
            }
          }
          // else
          //   // Mensagem de transferencia do ATENDENTE
          //   if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId) && (!ticket.isGroup || groupAsTicket === "enabled")) {
          //     const wbot = await GetTicketWbot(ticket);
          //     const nome = await ShowUserService(ticketData.userId, companyId);
          //     const msgtxt = `\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o atendente *${nome.name}*\nAguarde um momento, iremos atende-lo(a)!`;

          //     const queueChangedMessage = await wbot.sendMessage(
          //       `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //       {
          //         text: msgtxt
          //       }
          //     );
          //     await verifyMessage(queueChangedMessage, ticket, ticket.contact, ticketTraking);
          //   }
          //   else
          //     // Mensagem de transferencia do ATENDENTE e da FILA
          //     if (oldUserId !== userId && oldQueueId !== queueId && !isNil(oldUserId) && !isNil(userId) && (!ticket.isGroup || groupAsTicket === "enabled")) {
          //       const wbot = await GetTicketWbot(ticket);
          //       const nome = await ShowUserService(ticketData.userId, companyId);
          //       const msgtxt = `\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *${queue?.name}* e será atendido por *${nome.name}*\nAguarde um momento, iremos atende-lo(a)!`;

          //       const queueChangedMessage = await wbot.sendMessage(
          //         `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //         {
          //           text: msgtxt
          //         }
          //       );
          //       await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          //     } else
          //       if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

          //         const wbot = await GetTicketWbot(ticket);
          //         const msgtxt = "\u200e*Mensagem Automática*:\nVocê foi transferido(a) para o departamento *" + queue?.name + "*\nAguarde um momento, iremos atende-lo(a)!";

          //         const queueChangedMessage = await wbot.sendMessage(
          //           `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
          //           {
          //             text: msgtxt
          //           }
          //         );
          //         await verifyMessage(queueChangedMessage, ticket, ticket.contact);
          //       }
        }

        if (!isNil(msgTransfer)) {
          const messageData = {
            wid: `PVT${ticket.updatedAt.toString().replace(" ", "")}`,
            ticketId: ticket.id,
            contactId: undefined,
            body: msgTransfer,
            fromMe: true,
            mediaType: "extendedTextMessage",
            read: true,
            quotedMsgId: null,
            ack: 2,
            remoteJid: ticket.contact?.remoteJid,
            participant: null,
            dataJson: null,
            ticketTrakingId: null,
            isPrivate: true
          };

          await CreateMessageService({
            messageData,
            companyId: ticket.companyId
          });
        }

        if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para fila
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId === queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para atendente na mesma fila
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          //recebeu atendimento
          await CreateLogTicketService({
            userId,
            queueId: oldQueueId,
            ticketId: ticket.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== userId &&
          oldQueueId !== queueId &&
          !isNil(oldUserId) &&
          !isNil(userId)
        ) {
          //transferiu o atendimento para fila e atendente

          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
          //recebeu atendimento
          await CreateLogTicketService({
            userId,
            queueId,
            ticketId: ticket.id,
            type: "receivedTransfer"
          });
        } else if (
          oldUserId !== undefined &&
          isNil(userId) &&
          oldQueueId !== queueId &&
          !isNil(queueId)
        ) {
          await CreateLogTicketService({
            userId: oldUserId,
            queueId: oldQueueId,
            ticketId,
            type: "transfered"
          });
        }

        // if (ticket.status !== oldStatus || ticket.user?.id !== oldUserId) {
        //   await ticketTraking.update({
        //     userId: ticket.userId
        //   })

        //   io.to(oldStatus).emit(`company-${companyId}-ticket`, {
        //     action: "delete",
        //     ticketId: ticket.id
        //   });
        // }

        // io.to(ticket.status)
        //   .to("notification")
        //   .to(ticket.id.toString())
        //   .emit(`company-${companyId}-ticket`, {
        //     action: "update",
        //     ticket: ticket
        //   });

        // return { ticket, oldStatus, oldUserId };
      }
    }

    status = queue && queue.closeTicket ? "closed" : status;

    const prevStatus = ticket.status;
    const prevUserId = ticket.userId;
    const prevQueueId = ticket.queueId;
    const updatePayload: Record<string, unknown> = {
      status,
      queueId,
      userId,
      isBot,
      queueOptionId,
      amountUsedBotQueues:
        status === "closed"
          ? 0
          : amountUsedBotQueues
            ? amountUsedBotQueues
            : ticket.amountUsedBotQueues,
      lastMessage: lastMessage ? lastMessage : ticket.lastMessage,
      useIntegration,
      integrationId,
      typebotSessionId: !useIntegration ? null : ticket.typebotSessionId,
      typebotStatus: useIntegration,
      unreadMessages,
      valorVenda,
      motivoNaoVenda,
      motivoFinalizacao,
      finalizadoComVenda
    };
    if (resolvedTransferWhatsappId) {
      updatePayload.whatsappId = resolvedTransferWhatsappId;
    }
    if (Object.prototype.hasOwnProperty.call(ticketData, "dataWebhook")) {
      updatePayload.dataWebhook = ticketDataWebhookPatch;
    }
    await ticket.update(updatePayload as any);

    ticketTraking.queuedAt = moment().toDate();
    ticketTraking.queueId = queueId;

    await ticket.reload();

    logger.info(`[TICKET] id=${ticket.id} company=${ticket.companyId} ${prevStatus} -> ${ticket.status} | user ${prevUserId} -> ${ticket.userId} | queue ${prevQueueId} -> ${ticket.queueId}`);

    // ticket = await ShowTicketService(ticket.id, companyId)

    if (status !== undefined && ["pending"].indexOf(status) > -1) {
      //ticket voltou para fila
      logger.info(`[TICKET] id=${ticket.id} transitioned to pending; clearing traking.startedAt/userId`);
      await CreateLogTicketService({
        userId: oldUserId,
        ticketId,
        type: "pending"
      });

      await ticketTraking.update({
        whatsappId: ticket.whatsappId,
        startedAt: null,
        userId: null
      });
    }

    if (status !== undefined && ["open"].indexOf(status) > -1) {
      logger.info(`[TICKET] id=${ticket.id} transitioned/open; setting traking.startedAt and userId=${ticket.userId}`);
      await ticketTraking.update({
        startedAt: moment().toDate(),
        ratingAt: null,
        rated: false,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId,
        queueId: ticket.queueId
      });

      //loga inicio de atendimento
      await CreateLogTicketService({
        userId: userId,
        queueId: ticket.queueId,
        ticketId,
        type: oldStatus === "pending" ? "open" : "reopen"
      });
    }

    await ticketTraking.save();

    if (resolvedTransferWhatsappId) {
      await ticketTraking.update({
        whatsappId: resolvedTransferWhatsappId
      });
    }

    ticket = await ShowTicketService(ticket.id, companyId);

    if (
      ticket.status !== oldStatus ||
      ticket.user?.id !== oldUserId ||
      ticket.queueId !== oldQueueId
    ) {
      // console.log("emitiu socket 739", ticket.id)

      io.of(String(companyId))
        // .to(oldStatus)
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
    }
    // console.log("emitiu socket 746", ticket.id)

    io.of(String(companyId))
      // .to(ticket.status)
      // .to("notification")
      // .to(ticketId.toString())
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    return { ticket, oldStatus, oldUserId };
  } catch (err) {
    console.log(
      "erro ao atualizar o ticket",
      ticketId,
      "ticketData",
      ticketData
    );
    Sentry.captureException(err);
    throw err;
  }
};

export default UpdateTicketService;
