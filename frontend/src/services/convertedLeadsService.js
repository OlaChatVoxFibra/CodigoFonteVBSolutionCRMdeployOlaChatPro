/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const convertedLeadsService = {
  async list(params) {
    const { data } = await api.get("/converted-leads", { params });
    return data;
  },
  async show(id) {
    const { data } = await api.get(`/converted-leads/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/converted-leads", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/converted-leads/${id}`, payload);
    return data;
  },
  async remove(id) {
    const { data } = await api.delete(`/converted-leads/${id}`);
    return data;
  }
};

export default convertedLeadsService;
