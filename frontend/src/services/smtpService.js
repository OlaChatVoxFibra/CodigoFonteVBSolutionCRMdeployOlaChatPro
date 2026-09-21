/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const smtpService = {
  relaySettings: {
    get: async () => {
      const { data } = await api.request({
        url: "/smtp-configs/relay-settings",
        method: "GET"
      });
      return data;
    },
    put: async (payload) => {
      const { data } = await api.request({
        url: "/smtp-configs/relay-settings",
        method: "PUT",
        data: payload
      });
      return data;
    }
  },
  list: async () => {
    const { data } = await api.request({
      url: "/smtp-configs",
      method: "GET"
    });
    return data;
  },
  create: async (payload) => {
    const { data } = await api.request({
      url: "/smtp-configs",
      method: "POST",
      data: payload
    });
    return data;
  },
  /** Testa SMTP no servidor; timeout maior que o padrão do axios (verificação pode demorar). */
  verifyConnection: async (payload) => {
    const { data } = await api.request({
      url: "/smtp-configs/verify",
      method: "POST",
      data: payload,
      timeout: 120000
    });
    return data;
  },
  update: async (id, payload) => {
    const { data } = await api.request({
      url: `/smtp-configs/${id}`,
      method: "PUT",
      data: payload
    });
    return data;
  },
  remove: async (id) => {
    const { data } = await api.request({
      url: `/smtp-configs/${id}`,
      method: "DELETE"
    });
    return data;
  },
  setDefault: async (id) => {
    const { data } = await api.request({
      url: `/smtp-configs/${id}/default`,
      method: "POST"
    });
    return data;
  }
};

export default smtpService;

