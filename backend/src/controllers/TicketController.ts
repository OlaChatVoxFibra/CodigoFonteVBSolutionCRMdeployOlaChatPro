/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import Ticket from "../models/Ticket";
import { FlowBuilderModel } from "../models/FlowBuilder";
import Contact from "../models/Contact";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketUUIDService from "../services/TicketServices/ShowTicketFromUUIDService";
import ResolveTicketForLeadPreviewService from "../services/TicketServices/ResolveTicketForLeadPreviewService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import BulkAcceptTicketsService from "../services/TicketServices/BulkAcceptTicketsService";
import BulkCloseTicketsService from "../services/TicketServices/BulkCloseTicketsService";
import ListTicketsServiceKanban from "../services/TicketServices/ListTicketsServiceKanban";
import TriggerFlowService from "../services/TicketServices/TriggerFlowService";
import CreateLogTicketService from "../services/TicketServices/CreateLogTicketService";
import ShowLogTicketService from "../services/TicketServices/ShowLogTicketService";
import FindOrCreateATicketTrakingService from "../services/TicketServices/FindOrCreateATicketTrakingService";
import ListTicketsServiceReport from "../services/TicketServices/ListTicketsServiceReport";
import RelatorioVendasService from "../services/ReportService/RelatorioVendasService";
import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { isDevNoDb } from "../helpers/devNoDbAuth";
import { Mutex } from "async-mutex";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  updatedStart?: string;
  updatedEnd?: string;
  showAll: string;
  withUnreadMessages?: string;
  queueIds?: string;
  contacts?: string;
  tags?: string;
  users?: string;
  whatsapps: string;
  statusFilter: string;
  isGroup?: string;
  sortTickets?: string;
  searchOnMessages?: string;
};

type IndexQueryReport = {
  searchParam: string;
  contactId: string;
  whatsappId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  queueIds: string;
  tags: string;
  users: string;
  page: string;
  pageSize: string;
  onlyRated: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  sendFarewellMessage?: boolean;
  whatsappId?: string;
  valorVenda?: number;
  motivoNaoVenda?: string;
  motivoFinalizacao?: string;
  finalizadoComVenda?: boolean;
  isTransfered?: boolean;
  msgTransfer?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (isDevNoDb()) {
    return res.status(200).json({ tickets: [], count: 0, hasMore: false });
  }
  const {
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    updatedStart,
    updatedEnd,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    contacts: contactsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages,
    whatsapps: whatsappIdsStringified,
    statusFilter: statusStringfied,
    sortTickets,
    searchOnMessages
  } = req.query as IndexQuery;

  const userId = Number(req.user.id);
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let contactsIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let whatsappIds: number[] = [];
  let statusFilters: string[] = [];

  if (queueIdsStringified) {
    try {
      const parsed = JSON.parse(queueIdsStringified);
      queueIds = Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : [];
    } catch {
      queueIds = [];
    }
  }

  if (contactsStringified) {
    try {
      const parsed = JSON.parse(contactsStringified);
      contactsIds = Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : [];
    } catch {
      contactsIds = [];
    }
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (statusStringfied) {
    statusFilters = JSON.parse(statusStringfied);
  }

  const { tickets, count, hasMore } = await ListTicketsService({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    contacts: contactsIds,
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    updatedStart,
    updatedEnd,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    whatsappIds,
    statusFilters,
    companyId,
    sortTickets,
    searchOnMessages
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const indexReport = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    page,
    pageSize,
    searchParam,
    contactId,
    whatsappId: whatsappIdsStringified,
    dateFrom,
    dateTo,
    status: statusStringified,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    onlyRated
  } = req.query as IndexQueryReport;

  const { companyId, id: requestUserId } = req.user;

  let queueIds: number[] = [];
  let whatsappIds: string[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let status: string[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  if (statusStringified) {
    status = JSON.parse(statusStringified);
  }

  const { tickets, totalTickets } = await ListTicketsServiceReport(
    companyId,
    {
      searchParam,
      queueIds,
      tags: tagsIds,
      users: usersIds,
      status,
      dateFrom,
      dateTo,
      contactId,
      whatsappId: whatsappIds,
      onlyRated,
      userId: req.user.id
    },
    +page,
    +pageSize,
    +requestUserId
  );

  return res.status(200).json({ tickets, totalTickets });
};

export const kanban = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore } = await ListTicketsServiceKanban({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    dateStart,
    dateEnd,
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId
  });

  return res.status(200).json({ tickets, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId, whatsappId }: TicketData =
    req.body;
  const { companyId, id: requestUserId, super: isSuper } = req.user;
  const data = req.body;
  const targetCompanyId = isSuper && data.companyId ? data.companyId : companyId;

  try {
    const ticket = await CreateTicketService({
      contactId,
      status,
      userId,
      companyId: targetCompanyId,
      queueId,
      whatsappId,
      requestUserId: +requestUserId
    });

    const io = getIO();
    io.of(String(targetCompanyId))
      // .to(ticket.status)
      .emit(`company-${targetCompanyId}-ticket`, {
        action: "update",
        ticket
      });

    return res.status(200).json(ticket);
  } catch (err) {
    // Se for erro 409 (ticket já existe)
    if (err.statusCode === 409) {
      const existingTicket = JSON.parse(err.message);
      
      // Verificar se o usuário que está tentando criar é o dono do ticket existente
      if (existingTicket.userId === userId) {
        // É o mesmo usuário, retornar o ticket existente
        return res.status(200).json(existingTicket);
      } else {
        // É outro usuário, retornar erro 403 (Forbidden)
        return res.status(403).json({
          error: "Ticket já existe",
          message: `Este contato já está sendo atendido por outro usuário: ${existingTicket.user?.name || 'Desconhecido'}`,
          ticket: existingTicket
        });
      }
    }
    // Para outros erros, lançar novamente
    throw err;
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  const contact = await ShowTicketService(ticketId, companyId, +userId);

  await CreateLogTicketService({
    userId: +userId,
    ticketId,
    type: "access"
  });

  return res.status(200).json(contact);
};

export const showLog = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  const log = await ShowLogTicketService({ ticketId, companyId });

  return res.status(200).json(log);
};

export const showFromUUID = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { uuid } = req.params;
  const { id: userId, companyId } = req.user;

  const ticket: Ticket = await ShowTicketUUIDService(uuid, companyId, +userId);

  if (
    ["whatsapp", "whatsapp_oficial"].includes(ticket.channel) &&
    ticket.whatsappId &&
    ticket.unreadMessages > 0
  ) {
    SetTicketMessagesAsRead(ticket);
  }

  await CreateLogTicketService({
    userId,
    ticketId: ticket.id,
    type: "access"
  });

  return res.status(200).json(ticket);
};

export const previewForContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId, phone } = req.query as {
    contactId?: string;
    phone?: string;
  };
  const { id: userId, companyId } = req.user;

  const ticket = await ResolveTicketForLeadPreviewService({
    companyId,
    contactId,
    phone,
    requestUserId: +userId
  });

  if (!ticket) {
    return res.status(200).json(null);
  }

  return res.status(200).json(ticket);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const ticketData: TicketData = req.body;
  const { id: requestUserId, companyId } = req.user;

  const mutex = new Mutex();
  const { ticket } = await mutex.runExclusive(async () => {
    const result = await UpdateTicketService({
      ticketData,
      ticketId,
      companyId,
      requestUserId: +requestUserId
    });
    return result;
  });

  return res.status(200).json(ticket);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { id: userId, companyId } = req.user;

  // await ShowTicketService(ticketId, companyId);

  const ticket = await DeleteTicketService(ticketId, userId, companyId, +userId);

  const io = getIO();

  io.of(String(companyId))
    // .to(ticket.status)
    // .to(ticketId)
    // .to("notification")
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const closeAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: requestUserId } = req.user;
  const {
    status = "open",
    queueIds: queueIdsBody,
    users: usersBody,
    tags: tagsBody,
    whatsappIds: whatsappIdsBody,
    showAll,
    withUnreadMessages,
    dateStart,
    dateEnd,
    updatedStart,
    updatedEnd
  } = req.body || {};

  const parseIdArray = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value.map(Number).filter(n => !Number.isNaN(n));
  };

  const result = await BulkCloseTicketsService({
    companyId,
    userId: +requestUserId,
    status: status || "open",
    queueIds: parseIdArray(queueIdsBody),
    users: parseIdArray(usersBody),
    tags: parseIdArray(tagsBody),
    whatsappIds: parseIdArray(whatsappIdsBody),
    showAll: showAll === "true" || showAll === true ? "true" : "false",
    withUnreadMessages:
      withUnreadMessages === "true" || withUnreadMessages === true
        ? "true"
        : "false",
    dateStart: typeof dateStart === "string" ? dateStart : undefined,
    dateEnd: typeof dateEnd === "string" ? dateEnd : undefined,
    updatedStart: typeof updatedStart === "string" ? updatedStart : undefined,
    updatedEnd: typeof updatedEnd === "string" ? updatedEnd : undefined
  });

  return res.status(200).json(result);
};

export const acceptAll = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: requestUserId } = req.user;
  const { queueIds } = req.body || {};

  const result = await BulkAcceptTicketsService({
    companyId,
    userId: +requestUserId,
    queueIds: Array.isArray(queueIds) ? queueIds.map(Number) : undefined
  });

  return res.status(200).json(result);
};

export const relatorioVendas = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { dateFrom, dateTo, userId } = req.query;
  const { companyId } = req.user;

  if (!dateFrom || !dateTo) {
    return res.status(400).json({
      error: "Data inicial e final são obrigatórias"
    });
  }

  try {
    const relatorio = await RelatorioVendasService({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      userId: userId ? Number(userId) : undefined,
      companyId
    });

    return res.status(200).json(relatorio);
  } catch (error) {
    console.error("Erro ao gerar relatório de vendas:", error);
    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const transferTickets = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { sourceConnectionId, targetConnectionId } = req.body;
  const { companyId } = req.user;
  const sourceId = Number(sourceConnectionId);
  const targetId = Number(targetConnectionId);

  if (!Number.isFinite(sourceId) || sourceId <= 0 || !Number.isFinite(targetId) || targetId <= 0) {
    return res.status(400).json({
      message: "Conexão de origem ou destino inválida"
    });
  }

  try {
    const [sourceConnection, targetConnection] = await Promise.all([
      Whatsapp.findOne({ where: { id: sourceId, companyId } }),
      Whatsapp.findOne({ where: { id: targetId, companyId } })
    ]);
    if (!sourceConnection || !targetConnection) {
      return res.status(400).json({
        message: "Conexão de origem ou destino não encontrada para esta empresa"
      });
    }

    // Contar tickets para transferir
    const ticketCount = await Ticket.count({
      where: {
        whatsappId: sourceId,
        companyId,
        status: ["open", "pending"]
      }
    });

    if (ticketCount === 0) {
      return res.status(200).json({
        requiresProgress: false,
        transferred: 0,
        message: "Nenhum ticket encontrado para transferir"
      });
    }

    const PROGRESS_THRESHOLD = 50;
    const io = getIO();

    if (ticketCount <= PROGRESS_THRESHOLD) {
      // Transferência imediata
      const tickets = await Ticket.findAll({
        where: {
          whatsappId: sourceId,
          companyId,
          status: ["open", "pending"]
        }
      });

      let transferred = 0;
      for (const ticket of tickets) {
        try {
          await ticket.update({ whatsappId: targetId });
          transferred++;
        } catch (error) {
          console.error(`Error transferring ticket ${ticket.id}:`, error);
        }
      }

      return res.status(200).json({
        requiresProgress: false,
        transferred,
        message: "Tickets transferidos com sucesso"
      });
    } else {
      // Transferência em background
      const jobId = `transfer-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`;

      // Processar em background
      setTimeout(async () => {
        const BATCH_SIZE = 50;
        let processed = 0;

        try {
          while (processed < ticketCount) {
            const tickets = await Ticket.findAll({
              where: {
                whatsappId: sourceId,
                companyId,
                status: ["open", "pending"]
              },
              limit: BATCH_SIZE,
              offset: processed
            });

            if (tickets.length === 0) break;

            for (const ticket of tickets) {
              try {
                await ticket.update({ whatsappId: targetId });
                processed++;
              } catch (error) {
                console.error(`Error transferring ticket ${ticket.id}:`, error);
              }
            }

            // Enviar progresso via WebSocket
            io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
              action: "progress",
              current: processed,
              total: ticketCount,
              jobId
            });

            // Pequena pausa para não sobrecarregar o banco
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Enviar conclusão
          io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
            action: "completed",
            transferred: processed,
            jobId
          });
        } catch (error) {
          console.error(`Error in transfer job ${jobId}:`, error);

          // Enviar erro via WebSocket
          io.to(`company-${companyId}`).emit(`transferTickets-${companyId}`, {
            action: "error",
            message: "Erro na transferência",
            jobId
          });
        }
      }, 0);

      return res.status(200).json({
        requiresProgress: true,
        totalTickets: ticketCount,
        jobId,
        message: "Transferência iniciada em background"
      });
    }
  } catch (error) {
    console.error("Error in transferTickets:", error);
    return res.status(500).json({
      message: "Erro interno do servidor"
    });
  }
};

export const triggerFlow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { flowId } = req.body;
  const { companyId } = req.user;

  try {
    // Verificar se o ticket existe e está com status "open"
    const ticket = await Ticket.findOne({
      where: {
        id: ticketId,
        companyId,
        status: "open"
      },
      include: [
        { model: Contact, as: "contact" },
        { model: User, as: "user" },
        { model: Whatsapp, as: "whatsapp" }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket não encontrado ou não está em atendimento"
      });
    }

    // Verificar se o usuário tem permissão para disparar fluxo no ticket
    if (ticket.userId !== parseInt(req.user.id)) {
      return res.status(403).json({
        error: "Você não tem permissão para disparar fluxo neste ticket"
      });
    }

    // Verificar se o fluxo existe
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: flowId,
        company_id: companyId
      }
    });

    if (!flow) {
      return res.status(404).json({
        error: "Fluxo não encontrado"
      });
    }

    // Chamar o serviço para disparar o fluxo
    const result = await TriggerFlowService({
      ticketId: ticket.id,
      flowId: flow.id,
      companyId,
      userId: parseInt(req.user.id)
    });

    return res.status(200).json({
      success: true,
      message: "Fluxo disparado com sucesso",
      data: result
    });

  } catch (error) {
    console.error("Erro ao disparar fluxo no ticket:", error);
    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};
