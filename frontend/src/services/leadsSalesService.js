/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const leadsSalesService = {
  async list(params) {
    const { data } = await api.get("/leads-sales", { params });
    return data; // { leads, count, hasMore }
  },
  async dashboard(params) {
    const { data } = await api.get("/leads-sales/dashboard", { params });
    return data;
  },
  async create(payload) {
    const { data } = await api.post("/leads-sales", payload);
    return data;
  },
  async update(id, payload) {
    const { data } = await api.put(`/leads-sales/${id}`, payload);
    return data;
  },
  async delete(id) {
    const { data } = await api.delete(`/leads-sales/${id}`);
    return data;
  },
};

export default leadsSalesService;
