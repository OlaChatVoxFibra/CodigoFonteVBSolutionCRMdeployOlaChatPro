/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";
import User from "../../models/User";
import UserQueue from "../../models/UserQueue";
import { getIO } from "../../libs/socket";
import ListUserQueueImmediateService from "../UserQueueServices/ListUserQueueImmediateService";
import UpdateTicketService from "./UpdateTicketService";
import CreateLogTicketService from "./CreateLogTicketService";

interface TicketTimeoutData {
  ticketId: number;
  queueId: number;
  companyId: number;
  timeoutMinutes: number;
}

const TicketTimeoutService = async ({
  ticketId,
  queueId,
  companyId,
  timeoutMinutes = 5
}: TicketTimeoutData): Promise<void> => {
  // Aguardar o tempo de timeout
  setTimeout(async () => {
    try {
      // Buscar o ticket
      const ticket = await Ticket.findByPk(ticketId, {
        include: [
          { model: Queue, as: "queue" },
          { model: User, as: "user" }
        ]
      });

      if (!ticket) {
        console.log(`[TICKET TIMEOUT] Ticket ${ticketId} não encontrado`);
        return;
      }

      // Verificar se o ticket ainda está pendente (não foi aceito)
      if (ticket.status !== "pending") {
        console.log(`[TICKET TIMEOUT] Ticket ${ticketId} já foi aceito, cancelando timeout`);
        return;
      }

      // Verificar se a fila ainda tem randomização imediata ativada
      const queue = await Queue.findByPk(queueId);
      if (!queue || !queue.randomizeImmediate || !queue.ativarRoteador) {
        console.log(`[TICKET TIMEOUT] Randomização imediata desativada para fila ${queueId}`);
        return;
      }

      console.log(`[TICKET TIMEOUT] Timeout atingido para ticket ${ticketId}, transferindo para próximo usuário`);

      // Buscar próximo usuário disponível
      const nextUserResult = await ListUserQueueImmediateService(queueId, ticketId);
      
      if (nextUserResult.isImmediate && nextUserResult.userId) {
        // Atualizar ticket para o próximo usuário
        const updatedTicket = await UpdateTicketService({
          ticketData: {
            userId: nextUserResult.userId,
            status: "pending"
          },
          ticketId: ticket.id,
          companyId
        });

        // Criar log da transferência
        await CreateLogTicketService({
          ticketId: ticket.id,
          type: "transfered",
          queueId: queueId,
          userId: nextUserResult.userId
        });

        // Notificar via socket
        const io = getIO();
        io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket: {
            ticket: updatedTicket.ticket,
            userId: nextUserResult.userId
          }
        });

        console.log(`[TICKET TIMEOUT] Ticket ${ticketId} transferido para usuário ${nextUserResult.userId}`);

        // Agendar próximo timeout se necessário
        await TicketTimeoutService({
          ticketId,
          queueId,
          companyId,
          timeoutMinutes
        });
      } else if (nextUserResult.isImmediate && !nextUserResult.userId) {
        console.log(`[TICKET TIMEOUT] Nenhum usuário online disponível para ticket ${ticketId}, mantendo na fila`);
        // Não agendar próximo timeout se não há usuários disponíveis
      }
    } catch (error) {
      console.error(`[TICKET TIMEOUT] Erro ao processar timeout do ticket ${ticketId}:`, error);
    }
  }, timeoutMinutes * 60 * 1000); // Converter minutos para milissegundos
};

export default TicketTimeoutService;
