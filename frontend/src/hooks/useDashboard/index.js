/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "../../services/api";
import { toast } from "react-toastify";

const useDashboard = () => {
  const find = async (params) => {
    try {
      console.log('Buscando dados do dashboard com params:', params);
      
      const { data } = await api.request({
        url: `/dashboard`,
        method: 'GET',
        params
      });

      console.log('Dados recebidos do dashboard:', data);

      // Validar estrutura dos dados
      if (!data) {
        throw new Error('Nenhum dado retornado do servidor');
      }

      // Garantir que counters existe e tem valores padrão
      const defaultCounters = {
        avgSupportTime: 0,
        avgWaitTime: 0,
        supportFinished: 0,
        supportHappening: 0,
        supportPending: 0,
        supportGroups: 0,
        leads: 0,
        activeTickets: 0,
        passiveTickets: 0,
        tickets: 0,
        waitRating: 0,
        withoutRating: 0,
        withRating: 0,
        percRating: 0,
        npsPromotersPerc: 0,
        npsPassivePerc: 0,
        npsDetractorsPerc: 0,
        npsScore: 0
      };

      const responseData = {
        counters: { ...defaultCounters, ...data.counters },
        attendants: Array.isArray(data.attendants) ? data.attendants : []
      };

      console.log('Dados processados do dashboard:', responseData);

      return responseData;
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao carregar dados do dashboard');
      }
      
      // Retornar dados vazios em caso de erro
      return {
        counters: {
          avgSupportTime: 0,
          avgWaitTime: 0,
          supportFinished: 0,
          supportHappening: 0,
          supportPending: 0,
          supportGroups: 0,
          leads: 0,
          activeTickets: 0,
          passiveTickets: 0,
          tickets: 0,
          waitRating: 0,
          withoutRating: 0,
          withRating: 0,
          percRating: 0,
          npsPromotersPerc: 0,
          npsPassivePerc: 0,
          npsDetractorsPerc: 0,
          npsScore: 0
        },
        attendants: []
      };
    }
  };

  const getReport = async (params) => {
    try {
      console.log('Buscando relatório com params:', params);
      
      const { data } = await api.request({
        url: `/ticketreport/reports`,
        method: 'GET',
        params
      });

      console.log('Dados do relatório recebidos:', data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
      
      if (error?.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Erro ao carregar relatório');
      }
      
      return { data: [] };
    }
  };

  return {
    find,
    getReport
  };
};

export default useDashboard;