/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import DashboardDataService, { DashboardData, Params } from "../services/ReportService/DashbardDataService";
import { TicketsAttendance } from "../services/ReportService/TicketsAttendance";
import { TicketsDayService } from "../services/ReportService/TicketsDayService";
import TicketsQueuesService from "../services/TicketServices/TicketsQueuesService";
import AppError from "../errors/AppError";

type IndexQuery = {
  initialDate: string;
  finalDate: string;
  companyId: number | any;
};

type IndexQueryPainel = {
  dateStart: string;
  dateEnd: string;
  status: string[];
  queuesIds: string[];
  showAll: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const params: Params = req.query;
    const { companyId } = req.user;

    console.log('Dashboard params recebidos:', params);
    console.log('Company ID:', companyId);

    // Validar se a empresa existe
    if (!companyId) {
      throw new AppError('ID da empresa não encontrado', 400);
    }

    // Se não há parâmetros de data, usar os últimos 30 dias como padrão
    let processedParams: Params = { ...params };
    
    if (!params.days && !params.date_from && !params.date_to) {
      processedParams = {
        days: 30 // Padrão de 30 dias
      };
    }

    // Validar parâmetros de data
    if (params.date_from && params.date_to) {
      const dateFrom = new Date(params.date_from);
      const dateTo = new Date(params.date_to);
      
      if (dateFrom > dateTo) {
        throw new AppError('Data inicial não pode ser maior que data final', 400);
      }
    }

    console.log('Parâmetros processados:', processedParams);

    const dashboardData: DashboardData = await DashboardDataService(
      companyId,
      processedParams
    );

    console.log('Dashboard data retornado:', dashboardData);

    // Garantir que os dados tenham a estrutura esperada
    const responseData = {
      counters: dashboardData.counters || {},
      attendants: Array.isArray(dashboardData.attendants) ? dashboardData.attendants : []
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Erro no dashboard controller:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor ao buscar dados do dashboard'
    });
  }
};

export const reportsUsers = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { initialDate, finalDate } = req.query as IndexQuery;
    const { companyId } = req.user;
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const userIdRaw = req.query.userId ?? req.query.user_id;
    const userId =
      userIdRaw != null && String(userIdRaw).trim() !== "" && !Number.isNaN(Number(userIdRaw))
        ? Number(userIdRaw)
        : null;

    if (!initialDate || !finalDate) {
      throw new AppError('Datas inicial e final são obrigatórias', 400);
    }

    const { data } = await TicketsAttendance({
      initialDate: String(initialDate),
      finalDate: String(finalDate),
      companyId: Number(companyId),
      userId,
      channel
    });
    return res.json({ data });
  } catch (error) {
    console.error('Erro no reportsUsers:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor ao buscar relatório de usuários'
    });
  }
};

export const reportsDay = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { initialDate, finalDate } = req.query as IndexQuery;
    const { companyId } = req.user;
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const userIdRaw = req.query.userId ?? req.query.user_id;
    const userId =
      userIdRaw != null && String(userIdRaw).trim() !== "" && !Number.isNaN(Number(userIdRaw))
        ? Number(userIdRaw)
        : null;

    if (!initialDate || !finalDate) {
      throw new AppError('Datas inicial e final são obrigatórias', 400);
    }

    const { count, data } = await TicketsDayService({
      initialDate: String(initialDate),
      finalDate: String(finalDate),
      companyId: Number(companyId),
      userId,
      channel
    });
    return res.json({ count, data });
  } catch (error) {
    console.error('Erro no reportsDay:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor ao buscar relatório diário'
    });
  }
};

export const DashTicketsQueues = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId, profile, id: userId } = req.user;
    const { dateStart, dateEnd, status, queuesIds, showAll } = req.query as IndexQueryPainel;

    const tickets = await TicketsQueuesService({
      showAll: profile === "admin" ? showAll : false,
      dateStart,
      dateEnd,
      status,
      queuesIds,
      userId,
      companyId,
      profile
    });

    return res.status(200).json(tickets);
  } catch (error) {
    console.error('Erro no DashTicketsQueues:', error);
    
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: 'error',
        message: error.message
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor ao buscar tickets das filas'
    });
  }
};