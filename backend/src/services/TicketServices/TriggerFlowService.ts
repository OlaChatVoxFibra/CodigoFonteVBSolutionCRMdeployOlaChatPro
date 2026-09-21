/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";
import UpdateTicketService from "./UpdateTicketService";
import CreateLogTicketService from "./CreateLogTicketService";
import { getWbot } from "../../libs/wbot";
import { generateHashWebhookId } from "../../utils/GenerateHashWebhookId";

interface TriggerFlowRequest {
  ticketId: number;
  flowId: number;
  companyId: number;
  userId: number;
}

interface TriggerFlowResponse {
  ticket: Ticket;
  flow: FlowBuilderModel;
  message: string;
}

const TriggerFlowService = async ({
  ticketId,
  flowId,
  companyId,
  userId
}: TriggerFlowRequest): Promise<TriggerFlowResponse> => {
  
  // Buscar o ticket com todas as informações necessárias
  const ticket = await Ticket.findOne({
    where: {
      id: ticketId,
      companyId,
      status: "open"
    },
    include: [
      { model: Contact, as: "contact" },
      { model: Whatsapp, as: "whatsapp" }
    ]
  });

  if (!ticket) {
    throw new Error("Ticket não encontrado ou não está em atendimento");
  }

  // Buscar o fluxo
  const flow = await FlowBuilderModel.findOne({
    where: {
      id: flowId,
      company_id: companyId
    }
  });

  if (!flow) {
    throw new Error("Fluxo não encontrado");
  }

  // Extrair nós e conexões do fluxo
  const nodes: INodes[] = flow.flow["nodes"];
  const connections: IConnections[] = flow.flow["connections"];

  if (!nodes || nodes.length === 0) {
    throw new Error("Fluxo não possui nós configurados");
  }

  // Gerar hash para controle do fluxo
  const hashWebhookId = generateHashWebhookId();

  // Dados do contato para o fluxo
  const mountDataContact = {
    number: ticket.contact.number,
    name: ticket.contact.name,
    email: ticket.contact.email || ""
  };//

  // Atualizar o ticket para status "chatbot" e configurar campos do fluxo
  await UpdateTicketService({
    ticketData: {
      userId: ticket.userId,
      queueId: ticket.queueId,
      isBot: false,
      isTransfered: false
    },
    ticketId: ticket.id,
    companyId
  });

  // Criar log de mudança para chatbot
  await CreateLogTicketService({
    userId,
    ticketId: ticket.id,
    type: "open"
  });

  // Disparar o fluxo através do ActionsWebhookService
  await ActionsWebhookService(
    ticket.whatsapp.id,
    flowId,
    companyId,
    nodes,
    connections,
    nodes[0].id, // Começar pelo primeiro nó
    null,
    "",
    hashWebhookId,
    null,
    ticket.id,
    mountDataContact,
    false // inputResponded false para início do fluxo
  );

  // Buscar o ticket atualizado
  const updatedTicket = await Ticket.findByPk(ticket.id, {
    include: [
      { model: Contact, as: "contact" },
      { model: Whatsapp, as: "whatsapp" }
    ]
  });

  return {
    ticket: updatedTicket,
    flow,
    message: `Fluxo "${flow.name}" disparado com sucesso no ticket ${ticket.id}`
  };
};

export default TriggerFlowService;