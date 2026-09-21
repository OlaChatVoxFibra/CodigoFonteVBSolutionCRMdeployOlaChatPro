/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreateQueueService from "../services/QueueService/CreateQueueService";
import DeleteQueueService from "../services/QueueService/DeleteQueueService";
import ListQueuesService from "../services/QueueService/ListQueuesService";
import ShowQueueService from "../services/QueueService/ShowQueueService";
import UpdateQueueService from "../services/QueueService/UpdateQueueService";
import { isNil } from "lodash";

type QueueFilter = {
  companyId: number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId: userCompanyId } = req.user;
  const { companyId: queryCompanyId } = req.query as unknown as QueueFilter;
  let companyId = userCompanyId;

  if (!isNil(queryCompanyId)) {
    companyId = +queryCompanyId;
  }

  const queues = await ListQueuesService({ companyId });

  return res.status(200).json(queues);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    color,
    greetingMessage,
    outOfHoursMessage,
    schedules,
    chatbots,
    orderQueue,
    tempoRoteador,
    ativarRoteador,
    integrationId,
    fileListId,
    closeTicket,
    typeRandomMode,
    randomizeImmediate,
    tipoIntegracao,
    sendQueueEntryMessage,
    queueEntryMessage
  } = req.body;
  const { companyId } = req.user;

  const queue = await CreateQueueService({
    name,
    color,
    greetingMessage: greetingMessage ?? "",
    companyId,
    outOfHoursMessage: outOfHoursMessage ?? "",
    tempoRoteador:
      tempoRoteador === "" || tempoRoteador === undefined || tempoRoteador === null
        ? 0
        : Number(tempoRoteador) || 0,
    ativarRoteador: Boolean(ativarRoteador),
    schedules,
    chatbots,
    orderQueue: orderQueue === "" || orderQueue === undefined ? null : orderQueue,
    integrationId:
      integrationId === "" || integrationId === undefined ? null : integrationId,
    fileListId: fileListId === "" || fileListId === undefined ? null : fileListId,
    closeTicket: Boolean(closeTicket),
    typeRandomMode: typeRandomMode || "RANDOM",
    randomizeImmediate: Boolean(randomizeImmediate),
    tipoIntegracao: tipoIntegracao ?? "",
    sendQueueEntryMessage:
      sendQueueEntryMessage === undefined ? true : Boolean(sendQueueEntryMessage),
    queueEntryMessage:
      queueEntryMessage ||
      "Você está na fila *{{queue}}*. Em breve será atendido!"
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-queue`, {
    action: "update",
    queue
  });

  return res.status(200).json(queue);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId } = req.user;

  const queue = await ShowQueueService(queueId, companyId);

  return res.status(200).json(queue);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId, id: requestUserId } = req.user;

  const {
    name,
    color,
    greetingMessage,
    outOfHoursMessage,
    schedules,
    chatbots,
    orderQueue,
    tempoRoteador,
    ativarRoteador,
    integrationId,
    fileListId,
    closeTicket,
    typeRandomMode,
    randomizeImmediate,
    tipoIntegracao,
    sendQueueEntryMessage,
    queueEntryMessage
  } = req.body;

  const queue = await UpdateQueueService(queueId,
    {name,
    color,
    greetingMessage,
    outOfHoursMessage,
    tempoRoteador: tempoRoteador ===""? 0 : tempoRoteador,
    ativarRoteador,
    schedules,
    chatbots,
    orderQueue: orderQueue === "" ? null : orderQueue,
    integrationId: integrationId === "" ? null : integrationId,
    fileListId: fileListId === "" ? null : fileListId,
    closeTicket,
    typeRandomMode,
    randomizeImmediate,
    tipoIntegracao,
    sendQueueEntryMessage,
    queueEntryMessage
  },
    companyId,
    +requestUserId);

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-queue`, {
    action: "update",
    queue
  });

  return res.status(201).json(queue);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { queueId } = req.params;
  const { companyId } = req.user;

  await DeleteQueueService(queueId, companyId);

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-queue`, {
    action: "delete",
    queueId: +queueId
  });

  return res.status(200).send();
};
