/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { getBodyMessage } from "../WbotServices/wbotMessageListener";
import { ActionsWebhookService } from "./ActionsWebhookService";
import Ticket from "../../models/Ticket";
import { proto, WASocket } from "baileys";
import Whatsapp from "../../models/Whatsapp";
import { Session } from "../../libs/wbot";
import Contact from "../../models/Contact";
import { IConnections, INodes } from "./DispatchWebHookService";

const flowBuilderQueue = async (
  ticket: Ticket,
  msg: proto.IWebMessageInfo,
  wbot: Session,
  whatsapp: Whatsapp,
  companyId: number,
  contact: Contact,
  isFirstMsg: Ticket
) => {
  const body = getBodyMessage(msg);

  // Verificar se existe fluxo interrompido válido
  if (!ticket.flowStopped || !ticket.lastFlowId) {
    console.log("Ticket sem fluxo interrompido ou ID de último fluxo");
    return;
  }

  try {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: ticket.flowStopped,
        company_id: companyId // Usar company_id conforme o modelo
      }
    });

    if (!flow) {
      console.log(`Fluxo ${ticket.flowStopped} não encontrado para a empresa ${companyId}`);
      return;
    }

    const mountDataContact = {
      number: contact.number,
      name: contact.name,
      email: contact.email
    };

    const nodes: INodes[] = flow.flow["nodes"];
    const connections: IConnections[] = flow.flow["connections"];

    await ActionsWebhookService(
      whatsapp.id,
      parseInt(ticket.flowStopped),
      ticket.companyId,
      nodes,
      connections,
      ticket.lastFlowId,
      null,
      "",
      "",
      body,
      ticket.id,
      mountDataContact
    );
    
    console.log(`Fluxo interrompido ${ticket.flowStopped} executado com sucesso`);

  } catch (error) {
    console.error("Erro ao executar fluxo interrompido:", error);
  }
};

export default flowBuilderQueue;
