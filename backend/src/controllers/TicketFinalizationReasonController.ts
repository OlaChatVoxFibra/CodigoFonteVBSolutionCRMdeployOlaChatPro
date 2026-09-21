/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateTicketFinalizationReasonService from "../services/TicketFinalizationReasonService/CreateTicketFinalizationReasonService";
import ListTicketFinalizationReasonsService from "../services/TicketFinalizationReasonService/ListTicketFinalizationReasonsService";
import UpdateTicketFinalizationReasonService from "../services/TicketFinalizationReasonService/UpdateTicketFinalizationReasonService";
import DeleteTicketFinalizationReasonService from "../services/TicketFinalizationReasonService/DeleteTicketFinalizationReasonService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, description } = req.body;
  const { companyId } = req.user;

  const reason = await CreateTicketFinalizationReasonService({
    name,
    description,
    companyId
  });

  const io = getIO();
  io.emit(`ticketFinalizationReason:${companyId}`, {
    action: "create",
    reason
  });

  return res.status(200).json(reason);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as { searchParam: string };
  const { companyId } = req.user;

  const reasons = await ListTicketFinalizationReasonsService({
    companyId,
    searchParam
  });

  return res.status(200).json(reasons);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { name, description } = req.body;
  const { companyId } = req.user;

  const reason = await UpdateTicketFinalizationReasonService({
    id: parseInt(id),
    name,
    description,
    companyId
  });

  const io = getIO();
  io.emit(`ticketFinalizationReason:${companyId}`, {
    action: "update",
    reason
  });

  return res.status(200).json(reason);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteTicketFinalizationReasonService({
    id: parseInt(id),
    companyId
  });

  const io = getIO();
  io.emit(`ticketFinalizationReason:${companyId}`, {
    action: "delete",
    reasonId: id
  });

  return res
    .status(200)
    .json({ message: "Motivo de finalização excluído com sucesso" });
};
