/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const emailService = {
  list: async (params) => {
    const { data } = await api.request({
      url: "/email/recent",
      method: "GET",
      params,
    });
    return data;
  },
  schedules: {
    list: async (params) => {
      const { data } = await api.request({
        url: "/email/schedules",
        method: "GET",
        params
      });
      return data;
    },
    cancel: async (id) => {
      const { data } = await api.request({
        url: `/email/schedules/${id}/cancel`,
        method: "POST"
      });
      return data;
    },
    cancelAll: async (payload = {}) => {
      const { data } = await api.request({
        url: "/email/schedules/cancel-all",
        method: "POST",
        data: payload
      });
      return data;
    }
  },
  templates: {
    list: async (params) => {
      const { data } = await api.request({
        url: "/email/templates",
        method: "GET",
        params
      });
      return data;
    },
    save: async (payload) => {
      if (payload.id) {
        const { data } = await api.request({
          url: `/email/templates/${payload.id}`,
          method: "PUT",
          data: payload
        });
        return data;
      }
      const { data } = await api.request({
        url: "/email/templates",
        method: "POST",
        data: payload
      });
      return data;
    },
    uploadAttachments: async (templateId, files) => {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const { data } = await api.request({
        url: `/email/templates/${templateId}/attachments`,
        method: "POST",
        data: form
      });
      return data;
    },
    listAttachments: async (templateId) => {
      const { data } = await api.request({
        url: `/email/templates/${templateId}/attachments`,
        method: "GET"
      });
      return data;
    },
    uploadSignatureImage: async (templateId, file) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.request({
        url: `/email/templates/${templateId}/signature-image`,
        method: "POST",
        data: form
      });
      return data;
    },
    clearSignature: async (templateId) => {
      const { data } = await api.request({
        url: `/email/templates/${templateId}/signature-image`,
        method: "DELETE"
      });
      return data;
    },
    deleteAttachment: async (templateId, attachmentId) => {
      const { data } = await api.request({
        url: `/email/templates/${templateId}/attachments/${attachmentId}`,
        method: "DELETE"
      });
      return data;
    },
    create: async (payload) => {
      const { data } = await api.request({
        url: "/email/templates",
        method: "POST",
        data: payload
      });
      return data;
    },
    update: async (id, payload) => {
      const { data } = await api.request({
        url: `/email/templates/${id}`,
        method: "PUT",
        data: payload
      });
      return data;
    },
    remove: async (id) => {
      const { data } = await api.request({
        url: `/email/templates/${id}`,
        method: "DELETE"
      });
      return data;
    }
  },
  contacts: {
    list: async (params) => {
      const { data } = await api.request({
        url: "/email/contacts",
        method: "GET",
        params
      });
      return data;
    }
  },
  campaigns: {
    create: async (payload) => {
      const { data } = await api.request({
        url: "/email/campaigns",
        method: "POST",
        data: payload
      });
      return data;
    },
    schedule: async (id, payload) => {
      const { data } = await api.request({
        url: `/email/campaigns/${id}/schedule`,
        method: "POST",
        data: payload
      });
      return data;
    }
  },
  metrics: async () => {
    const { data } = await api.request({
      url: "/email/analytics/summary",
      method: "GET",
    });
    return data;
  },
  series: async (params) => {
    const { data } = await api.request({
      url: "/email/analytics/series",
      method: "GET",
      params
    });
    const arr = Array.isArray(data) ? data : data?.data;
    return arr || [];
  }
};

export default emailService;
