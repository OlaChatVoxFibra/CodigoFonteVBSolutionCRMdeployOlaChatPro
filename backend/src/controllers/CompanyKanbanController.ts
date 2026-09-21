/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import SetKanbanLaneOrderService from "../services/CompanyKanbanService/SetKanbanLaneOrderService";
import GetKanbanLaneOrderService from "../services/CompanyKanbanService/GetKanbanLaneOrderService";

export const setLaneOrder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { laneOrder } = req.body;
  const { companyId } = req.user;

  // Verificar se o usuário é admin
  if (req.user.profile !== 'admin') {
    return res.status(403).json({
      error: "Apenas administradores podem reordenar as lanes do Kanban",
    });
  }

  try {
    const config = await SetKanbanLaneOrderService({
      companyId,
      laneOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Ordem das lanes atualizada com sucesso",
      laneOrder: JSON.parse(config.laneOrder),
    });
  } catch (error) {
    console.error("Error setting kanban lane order:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
};

export const getLaneOrder = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  try {
    const laneOrder = await GetKanbanLaneOrderService({
      companyId,
    });

    return res.status(200).json({
      laneOrder,
    });
  } catch (error) {
    console.error("Error getting kanban lane order:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
};
