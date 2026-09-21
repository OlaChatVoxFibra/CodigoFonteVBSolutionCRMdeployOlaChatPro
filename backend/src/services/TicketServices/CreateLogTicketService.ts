/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// import AppError from "../../errors/AppError";
// import socketEmit from "../../helpers/socketEmit";
import LogTicket from "../../models/LogTicket";

type logType =
  | "access"
  | "create"
  | "closed"
  | "clientClosed"
  | "transfered"
  | "receivedTransfer"
  | "open"
  | "reopen"
  | "pending"
  | "nps"
  | "lgpd"
  | "queue"
  | "userDefine"
  | "delete"
  | "chatBot"
  | "autoClose"
  | "retriesLimitQueue"
  | "retriesLimitUserDefine"
  | "redirect"
  | "autoReturnQueue"
  | "lead_created"
  | "contact_created"
  | "activity_created"
  | "consultar_agenda"
  | "consultar_produtos"
  | "passar_preco"
  | "enviar_link"
  | "consultar_estoque"
  | "enviar_link_produto"
  | "registrar_intencao_compra"
  | "agendamento_criado";

interface Request {
  type: logType;
  ticketId: number | string;
  userId?: number | string;
  queueId?: number | string;
}

const CreateLogTicketService = async ({
  type,
  userId,
  ticketId,
  queueId
}: Request): Promise<void> => {
  await LogTicket.create({
    userId,
    ticketId,
    type,
    queueId
  });
};

export default CreateLogTicketService;
