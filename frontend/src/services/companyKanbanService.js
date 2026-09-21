/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from './api';

export const setKanbanLaneOrder = async (laneOrder) => {
  try {
    const response = await api.post('/company-kanban/lane-order', {
      laneOrder
    });
    return response.data;
  } catch (error) {
    console.error('Error setting kanban lane order:', error);
    throw error;
  }
};

export const getKanbanLaneOrder = async () => {
  try {
    const response = await api.get('/company-kanban/lane-order');
    return response.data.laneOrder;
  } catch (error) {
    console.error('Error getting kanban lane order:', error);
    return null;
  }
};
