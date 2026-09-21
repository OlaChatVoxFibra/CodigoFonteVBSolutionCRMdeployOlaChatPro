/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import { format } from "date-fns";

interface RelatorioVendasData {
  dateFrom: string;
  dateTo: string;
  userId?: number;
  companyId: number;
}

interface VendaStats {
  totalVendas: number;
  totalValorVendas: number;
  totalNaoVendas: number;
  motivosNaoVenda: { motivo: string; quantidade: number }[];
  motivosFinalizacao: { motivo: string; quantidade: number }[];
  mediaTicketPorAtendente: number;
  atendentes: {
    id: number;
    name: string;
    totalVendas: number;
    totalValorVendas: number;
    totalNaoVendas: number;
    mediaTicket: number;
  }[];
}

const RelatorioVendasService = async ({
  dateFrom,
  dateTo,
  userId,
  companyId
}: RelatorioVendasData): Promise<VendaStats> => {
  const whereClause: any = {
    companyId,
    status: "closed",
    createdAt: {
      [Op.between]: [new Date(dateFrom), new Date(dateTo)]
    }
  };

  if (userId) {
    whereClause.userId = userId;
  }

  // Buscar todos os tickets finalizados no período
  const tickets = await Ticket.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }
    ],
    order: [["createdAt", "DESC"]]
  });

  // Estatísticas gerais
  const ticketsComVenda = tickets.filter(t => t.finalizadoComVenda);
  const ticketsSemVenda = tickets.filter(t => !t.finalizadoComVenda);

  const totalVendas = ticketsComVenda.length;
  const totalValorVendas = ticketsComVenda.reduce((sum, ticket) => {
    return sum + (ticket.valorVenda || 0);
  }, 0);

  const totalNaoVendas = ticketsSemVenda.length;

  // Motivos de não venda
  const motivosCount: { [key: string]: number } = {};
  ticketsSemVenda.forEach(ticket => {
    if (ticket.motivoNaoVenda) {
      motivosCount[ticket.motivoNaoVenda] =
        (motivosCount[ticket.motivoNaoVenda] || 0) + 1;
    }
  });

  const motivosNaoVenda = Object.entries(motivosCount).map(
    ([motivo, quantidade]) => ({
      motivo,
      quantidade
    })
  );

  // Motivos de finalização
  const motivosFinalizacaoCount: { [key: string]: number } = {};
  tickets.forEach(ticket => {
    if (ticket.motivoFinalizacao) {
      motivosFinalizacaoCount[ticket.motivoFinalizacao] =
        (motivosFinalizacaoCount[ticket.motivoFinalizacao] || 0) + 1;
    }
  });

  const motivosFinalizacao = Object.entries(motivosFinalizacaoCount).map(
    ([motivo, quantidade]) => ({
      motivo,
      quantidade
    })
  );

  // Estatísticas por atendente
  const atendentesMap: { [key: number]: any } = {};

  tickets.forEach(ticket => {
    if (ticket.user) {
      const atendenteId = ticket.user.id;

      if (!atendentesMap[atendenteId]) {
        atendentesMap[atendenteId] = {
          id: atendenteId,
          name: ticket.user.name,
          totalVendas: 0,
          totalValorVendas: 0,
          totalNaoVendas: 0,
          totalTickets: 0
        };
      }

      atendentesMap[atendenteId].totalTickets++;

      if (ticket.finalizadoComVenda) {
        atendentesMap[atendenteId].totalVendas++;
        atendentesMap[atendenteId].totalValorVendas += ticket.valorVenda || 0;
      } else {
        atendentesMap[atendenteId].totalNaoVendas++;
      }
    }
  });

  const atendentes = Object.values(atendentesMap).map(atendente => ({
    ...atendente,
    mediaTicket: atendente.totalTickets > 0 ? atendente.totalTickets : 0
  }));

  const mediaTicketPorAtendente =
    atendentes.length > 0
      ? atendentes.reduce((sum, atendente) => sum + atendente.mediaTicket, 0) /
        atendentes.length
      : 0;

  return {
    totalVendas,
    totalValorVendas,
    totalNaoVendas,
    motivosNaoVenda,
    motivosFinalizacao,
    mediaTicketPorAtendente,
    atendentes
  };
};

export default RelatorioVendasService;
