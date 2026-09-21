/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

declare const require: any;
type Filterable = { where?: any };
const Sequelize = (() => { try { return require("sequelize"); } catch (_) { return {}; } })();
const Op: any = (Sequelize && Sequelize.Op) ? Sequelize.Op : { lt: Symbol("lt"), gt: Symbol("gt"), or: Symbol("or"), not: Symbol("not") };
import Ticket from "../../models/Ticket"
import Contact from "../../models/Contact"
import Whatsapp from "../../models/Whatsapp"
import { getIO } from "../../libs/socket"
import formatBody from "../../helpers/Mustache";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import SendWhatsAppOficialMessage from "../WhatsAppOficial/SendWhatsAppOficialMessage";
import moment from "moment";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { verifyMessage } from "./wbotMessageListener";
import TicketTraking from "../../models/TicketTraking";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import Company from "../../models/Company";
import logger from "../../utils/logger";
import { isNil } from "lodash";
import { sub } from "date-fns";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import ShowTicketUUIDService from "../TicketServices/ShowTicketFromUUIDService";

const closeTicket = async (ticket: any, body: string) => {
  await ticket.update({
    status: "closed",
    lastMessage: body,
    unreadMessages: 0,
    amountUsedBotQueues: 0
  });
  await CreateLogTicketService({
    userId: ticket.userId || null,
    queueId: ticket.queueId || null,
    ticketId: ticket.id,
    type: "autoClose"
  });
};

const handleOpenTickets = async (companyId: number, whatsapp: Whatsapp) => {
  const currentTime = new Date();
  const brazilTimeZoneOffset = -3 * 60; // Fuso horário do Brasil é UTC-3
  const currentTimeBrazil = new Date(currentTime.getTime() + brazilTimeZoneOffset * 60000); // Adiciona o offset ao tempo atual

  let timeInactiveMessage = Number(whatsapp.timeInactiveMessage || 0);
  let expiresTime = Number(whatsapp.expiresTicket || 0);
  let flowInactiveTime = Number(whatsapp.flowInactiveTime || 0);

  if (!isNil(expiresTime) && expiresTime > 0) {

    if (!isNil(timeInactiveMessage) && timeInactiveMessage > 0) {
      let whereCondition1: Filterable["where"];

      whereCondition1 = {
        status: {
          [Op.or]: ["open", "pending"]
        },
        companyId,
        whatsappId: whatsapp.id,
        updatedAt: {
          [Op.lt]: +sub(new Date(), {
            minutes: Number(timeInactiveMessage)
          })
        },
        imported: null,
        sendInactiveMessage: false
      };

      if (Number(whatsapp.whenExpiresTicket) === 1) {
        whereCondition1 = {
          ...whereCondition1,
          fromMe: true
        };
      }

      // ✅ RDS-FIX: Adicionado include Contact para getJidOf funcionar
      const ticketsForInactiveMessage = await (Ticket as any).findAll({
        where: whereCondition1,
        include: [{ model: Contact, as: "contact" }]
      });

      if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
        logger.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para enviar mensagem de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`)
        await Promise.all(ticketsForInactiveMessage.map(async ticket => {
          await ticket.reload();
          if (!ticket.sendInactiveMessage) {
            const bodyMessageInactive = formatBody(`\u200e ${whatsapp.inactiveMessage}`, ticket);
            if (ticket.channel === "whatsapp_oficial") {
              await SendWhatsAppOficialMessage({
                body: bodyMessageInactive,
                ticket: ticket,
                quotedMsg: null,
                type: 'text',
                media: null,
                vCard: null
              });
            } else {
              const sentMessage = await SendWhatsAppMessage({ body: bodyMessageInactive, ticket: ticket });
              await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, true);
            }
            await ticket.update({ sendInactiveMessage: true, fromMe: true });
          }
        }));
      }

      expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
    }

    let whereCondition: Filterable["where"];

    whereCondition = {
      status: "open",
      companyId,
      whatsappId: whatsapp.id,
      updatedAt: {
        [Op.lt]: +sub(new Date(), {
          minutes: Number(expiresTime)
        })
      },
      imported: null
    };

    if (timeInactiveMessage > 0) {
      whereCondition = {
        ...whereCondition,
        sendInactiveMessage: true,
      };
    }

    if (Number(whatsapp.whenExpiresTicket) === 1) {
      whereCondition = {
        ...whereCondition,
        fromMe: true
      };
    }

    // ✅ RDS-FIX: Adicionado include Contact para getJidOf funcionar
    const ticketsToClose = await (Ticket as any).findAll({
      where: whereCondition,
      include: [{ model: Contact, as: "contact" }]
    });


    if (ticketsToClose && ticketsToClose.length > 0) {
      logger.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar na empresa ${companyId} - na conexão ${whatsapp.name}!`);

      for (const ticket of ticketsToClose) {
        await ticket.reload();
        const ticketTraking = await (TicketTraking as any).findOne({
          where: { ticketId: ticket.id, finishedAt: null }
        });

        let bodyExpiresMessageInactive = "";

        if (!isNil(whatsapp.expiresInactiveMessage) && whatsapp.expiresInactiveMessage !== "") {
          bodyExpiresMessageInactive = formatBody(`\u200e${whatsapp.expiresInactiveMessage}`, ticket);
          if (ticket.channel === "whatsapp_oficial") {
            await SendWhatsAppOficialMessage({
              body: bodyExpiresMessageInactive,
              ticket: ticket,
              quotedMsg: null,
              type: 'text',
              media: null,
              vCard: null
            });
          } else {
            const sentMessage = await SendWhatsAppMessage({ body: bodyExpiresMessageInactive, ticket: ticket });
            await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, true);
          }
        }

        // Como o campo sendInactiveMessage foi atualizado, podemos garantir que a mensagem foi enviada
        await closeTicket(ticket, bodyExpiresMessageInactive);

        await ticketTraking.update({
          finishedAt: new Date(),
          closedAt: new Date(),
          whatsappId: ticket.whatsappId,
          userId: ticket.userId,
        });
        // console.log("emitiu socket 144", ticket.id)

        const io = getIO();
        io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
      }
    }
  }

  if (!isNil(flowInactiveTime) && flowInactiveTime > 0) {
    let whereCondition1: Filterable["where"];

    whereCondition1 = {
      status: "open",
      companyId,
      whatsappId: whatsapp.id,
      updatedAt: {
        [Op.lt]: +sub(new Date(), {
          minutes: Number(flowInactiveTime)
        })
      },
      imported: null,
      sendInactiveMessage: false
    };

    if (Number(whatsapp.whenExpiresTicket) === 1) {
      whereCondition1 = {
        ...whereCondition1,
        fromMe: true
      };
    }

    const ticketsForInactiveMessage = await (Ticket as any).findAll({
      where: whereCondition1,
      include: [
        {
          model: Contact,
          attributes: ["number", "name", "email"]
        }
      ]
    });

    if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
      logger.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para acionar o fluxo de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`)
      await Promise.all(ticketsForInactiveMessage.map(async ticket => {
        await ticket.reload();
        if (!ticket.sendInactiveMessage) {

          if (ticket.maxUseInactiveTime < whatsapp.maxUseInactiveTime) {
            const flow = await (FlowBuilderModel as any).findOne({
              where: {
                id: whatsapp.flowIdInactiveTime
              }
            });

            if (flow) {

              const contact = ticket.contact;

              const nodes: INodes[] = flow.flow["nodes"];
              const connections: IConnections[] = flow.flow["connections"];

              const mountDataContact = {
                number: contact.number,
                name: contact.name,
                email: contact.email
              };

              await ActionsWebhookService(
                whatsapp.id,
                whatsapp.flowIdInactiveTime,
                ticket.companyId,
                nodes,
                connections,
                flow.flow["nodes"][0].id,
                null,
                "",
                "",
                null,
                ticket.id,
                mountDataContact
              );

              await ticket.update({
                maxUseInactiveTime: ticket.maxUseInactiveTime ? ticket.maxUseInactiveTime + 1 : 1
              });

            }
          }

        }
      }));
    }

    expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
  };

};

const handleNPSTickets = async (companyId: number, whatsapp: any) => {
  const expiresTime = Number(whatsapp.expiresTicketNPS);
  const dataLimite = moment().subtract(expiresTime, 'minutes');

  const ticketsToClose = await (Ticket as any).findAll({
    where: {
      status: "nps",
      companyId,
      whatsappId: whatsapp.id,
      updatedAt: { [Op.lt]: dataLimite.toDate() },
      imported: null
    },
    include: [{ model: Contact, as: "contact" }]
  });

  if (ticketsToClose && ticketsToClose.length > 0) {
    logger.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar NPS na empresa ${companyId} - na conexão ${whatsapp.name}!`);
    await Promise.all(ticketsToClose.map(async ticket => {
      await ticket.reload();
      const ticketTraking = await (TicketTraking as any).findOne({
        where: { ticketId: ticket.id, finishedAt: null }
      });

      let bodyComplationMessage = "";

      if (!isNil(whatsapp.complationMessage) && whatsapp.complationMessage !== "") {
        bodyComplationMessage = formatBody(`\u200e${whatsapp.complationMessage}`, ticket);
        if (ticket.channel === "whatsapp_oficial") {
          await SendWhatsAppOficialMessage({
            body: bodyComplationMessage,
            ticket: ticket,
            quotedMsg: null,
            type: 'text',
            media: null,
            vCard: null
          });
        } else {
          const sentMessage = await SendWhatsAppMessage({ body: bodyComplationMessage, ticket: ticket });
          await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, true);
        }
      }

      await closeTicket(ticket, bodyComplationMessage);

      await ticketTraking.update({
        finishedAt: moment().toDate(),
        closedAt: moment().toDate(),
        whatsappId: ticket.whatsappId,
        userId: ticket.userId,
      });

      getIO().of(companyId.toString()).emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });
    }));
  }
};

const handleOpenPendingTickets = async (companyId: number, whatsapp: Whatsapp) => {
  const currentTime = new Date();
  const brazilTimeZoneOffset = -3 * 60; // Fuso horário do Brasil é UTC-3
  const currentTimeBrazil = new Date(currentTime.getTime() + brazilTimeZoneOffset * 60000); // Adiciona o offset ao tempo atual

  let timeInactiveMessage = Number(whatsapp.timeInactiveMessage || 0);
  let expiresTime = Number(whatsapp.expiresTicket || 0);
  let flowInactiveTime = Number(whatsapp.flowInactiveTime || 0);

  if (!isNil(expiresTime) && expiresTime > 0) {

    if (!isNil(timeInactiveMessage) && timeInactiveMessage > 0) {
      let whereCondition1: Filterable["where"];

      whereCondition1 = {
        status: {
          [Op.or]: ["open", "pending"]
        },
        companyId,
        whatsappId: whatsapp.id,
        updatedAt: {
          [Op.lt]: +sub(new Date(), {
            minutes: Number(timeInactiveMessage)
          })
        },
        imported: null,
        sendInactiveMessage: false
      };

      if (Number(whatsapp.whenExpiresTicket) === 1) {
        whereCondition1 = {
          ...whereCondition1,
          fromMe: true
        };
      }

      // ✅ RDS-FIX: Adicionado include Contact para getJidOf funcionar
      const ticketsForInactiveMessage = await Ticket.findAll({
        where: whereCondition1,
        include: [{ model: Contact, as: "contact" }]
      });

      if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
        logger.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para enviar mensagem de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`)
        await Promise.all(ticketsForInactiveMessage.map(async ticket => {
          await ticket.reload();
          if (!ticket.sendInactiveMessage) {
            const bodyMessageInactive = formatBody(`\u200e ${whatsapp.inactiveMessage}`, ticket);
            const sentMessage = await SendWhatsAppMessage({ body: bodyMessageInactive, ticket: ticket });
            await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, true);
            await ticket.update({ sendInactiveMessage: true, fromMe: true });
          }
        }));
      }

      expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
    }

    let whereCondition: Filterable["where"];

    whereCondition = {
      status: {
        [Op.or]: ["open", "pending"]
      },
      companyId,
      whatsappId: whatsapp.id,
      updatedAt: {
        [Op.lt]: +sub(new Date(), {
          minutes: Number(expiresTime)
        })
      },
      imported: null
    };

    if (timeInactiveMessage > 0) {
      whereCondition = {
        ...whereCondition,
        sendInactiveMessage: true,
      };
    }

    if (Number(whatsapp.whenExpiresTicket) === 1) {
      whereCondition = {
        ...whereCondition,
        fromMe: true
      };
    }

    // ✅ RDS-FIX: Adicionado include Contact para getJidOf funcionar
    const ticketsToClose = await Ticket.findAll({
      where: whereCondition,
      include: [{ model: Contact, as: "contact" }]
    });


    if (ticketsToClose && ticketsToClose.length > 0) {
      logger.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar na empresa ${companyId} - na conexão ${whatsapp.name}!`);

      for (const ticket of ticketsToClose) {
        await ticket.reload();
        const ticketTraking = await TicketTraking.findOne({
          where: { ticketId: ticket.id, finishedAt: null }
        });

        let bodyExpiresMessageInactive = "";

        if (!isNil(whatsapp.expiresInactiveMessage) && whatsapp.expiresInactiveMessage !== "") {
          bodyExpiresMessageInactive = formatBody(`\u200e${whatsapp.expiresInactiveMessage}`, ticket);
          const sentMessage = await SendWhatsAppMessage({ body: bodyExpiresMessageInactive, ticket: ticket });
          await verifyMessage(sentMessage, ticket, ticket.contact, undefined, false, false, true);
        }

        // Como o campo sendInactiveMessage foi atualizado, podemos garantir que a mensagem foi enviada
        await closeTicket(ticket, bodyExpiresMessageInactive);

        await ticketTraking.update({
          finishedAt: new Date(),
          closedAt: new Date(),
          whatsappId: ticket.whatsappId,
          userId: ticket.userId,
        });
        // console.log("emitiu socket 144", ticket.id)

        const io = getIO();
        io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: ticket.id
        });
      }
    }
  }

  if (!isNil(flowInactiveTime) && flowInactiveTime > 0) {
    let whereCondition1: Filterable["where"];

    whereCondition1 = {
      status: {
        [Op.or]: ["open", "pending"]
      },
      companyId,
      whatsappId: whatsapp.id,
      updatedAt: {
        [Op.lt]: +sub(new Date(), {
          minutes: Number(flowInactiveTime)
        })
      },
      imported: null,
      sendInactiveMessage: false
    };

    if (Number(whatsapp.whenExpiresTicket) === 1) {
      whereCondition1 = {
        ...whereCondition1,
        fromMe: true
      };
    }

      const ticketsForInactiveMessage = await (Ticket as any).findAll({
        where: whereCondition1,
        include: [
          {
            model: Contact,
            attributes: ["number", "name", "email"]
          }
        ]
      });

    if (ticketsForInactiveMessage && ticketsForInactiveMessage.length > 0) {
      logger.info(`Encontrou ${ticketsForInactiveMessage.length} atendimentos para acionar o fluxo de inatividade na empresa ${companyId}- na conexão ${whatsapp.name}!`)
      await Promise.all(ticketsForInactiveMessage.map(async ticket => {
        await ticket.reload();
        if (!ticket.sendInactiveMessage) {

          if (ticket.maxUseInactiveTime < whatsapp.maxUseInactiveTime) {
            const flow = await (FlowBuilderModel as any).findOne({
              where: {
                id: whatsapp.flowIdInactiveTime
              }
            });

            if (flow) {

              const contact = ticket.contact;

              const nodes: INodes[] = flow.flow["nodes"];
              const connections: IConnections[] = flow.flow["connections"];

              const mountDataContact = {
                number: contact.number,
                name: contact.name,
                email: contact.email
              };

              await ActionsWebhookService(
                whatsapp.id,
                whatsapp.flowIdInactiveTime,
                ticket.companyId,
                nodes,
                connections,
                flow.flow["nodes"][0].id,
                null,
                "",
                "",
                null,
                ticket.id,
                mountDataContact
              );

              await ticket.update({
                maxUseInactiveTime: ticket.maxUseInactiveTime ? ticket.maxUseInactiveTime + 1 : 1
              });

            }
          }

        }
      }));
    }

    expiresTime += timeInactiveMessage; // Adicionando o tempo de inatividade ao tempo de expiração
  };

};

const handleReturnQueue = async (companyId: number, whatsapp: Whatsapp) => {
  const timeToReturnQueue = Number(whatsapp.timeToReturnQueue || 0);
  const currentTime = new Date();
  const currentTimeBrazil = new Date(currentTime.getTime() + timeToReturnQueue * 60000);

  const ticketsToReturnQueue = await (Ticket as any).findAll({
    where: {
      status: { [Op.or]: ["open", "group"] },
      companyId,
      whatsappId: whatsapp.id,
      userId: { [Op.not]: null },
      fromMe: Number(whatsapp.whenExpiresTicket) === 1 ? true : false,
      updatedAt: {
        [Op.lt]: +sub(new Date(), {
          minutes: Number(timeToReturnQueue)
        })
      },
      imported: null
    },
    include: [{ model: Contact, as: "contact" }]
  });

  if (ticketsToReturnQueue && ticketsToReturnQueue.length > 0) {
    logger.info(`Encontrou ${ticketsToReturnQueue.length} atendimentos para retornar a fila na empresa ${companyId} - na conexão ${whatsapp.name}!`);
    await Promise.all(ticketsToReturnQueue.map(async ticket => {
      await ticket.update({
        status: "pending",
        userId: null,
      });

      await ticket.reload();

      await CreateLogTicketService({
        userId: ticket.userId || null,
        ticketId: ticket.id,
        type: "autoReturnQueue"
      });

      const ticketSocket = await ShowTicketUUIDService(ticket.uuid, companyId);

      const io = getIO();
      io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: ticketSocket.id
      });

      io.of(companyId.toString()).emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket: ticketSocket,
        ticketId: ticketSocket.id
      });
    }));
  }
};

export const ClosedAllOpenTickets = async (companyId: number): Promise<void> => {

  try {
    const whatsapps = await (Whatsapp as any).findAll({
      attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue", "timeInactiveMessage",
        "expiresInactiveMessage", "inactiveMessage", "expiresTicket", "expiresTicketNPS", "whenExpiresTicket",
        "complationMessage", "flowInactiveTime", "flowIdInactiveTime", "maxUseInactiveTime", "timeToReturnQueue", "timeAwaitActiveFlowId", "timeAwaitActiveFlow"],
      where: {
        [Op.or]: [
          { expiresTicket: { [Op.gt]: '0' } },
          { expiresTicketNPS: { [Op.gt]: '0' } },
          { flowInactiveTime: { [Op.gt]: '0' } },
          { timeToReturnQueue: { [Op.gt]: '0' } },
          { timeAwaitActiveFlow: { [Op.gt]: '0' } }
        ],
        companyId: companyId, // Filtrar pelo companyId fornecido como parâmetro
        status: "CONNECTED"
      }
    });

    // Agora você pode iterar sobre as instâncias de Whatsapp diretamente
    if (whatsapps.length > 0) {
      for (const whatsapp of whatsapps) {
        if (whatsapp.expiresTicket) {
          await handleOpenTickets(companyId, whatsapp);
        }
        if (whatsapp.expiresTicketNPS) {
          await handleNPSTickets(companyId, whatsapp);
        }
        if (whatsapp.flowInactiveTime) {
          await handleOpenPendingTickets(companyId, whatsapp);
        }
        if (whatsapp.timeToReturnQueue) {
          await handleReturnQueue(companyId, whatsapp);
        }
      }
    }

  } catch (error) {
    console.error('Erro:', error);
  }
};
