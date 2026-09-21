/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const projectsService = {
  getProjects: async ({ pageNumber = 1, searchParam = "" }) => {
    const { data } = await api.get("/projects", {
      params: {
        pageNumber,
        searchParam,
      },
    });
    return data;
  },

  /** Alias usado por hooks/useProjects/index.js */
  list: async ({ pageNumber = 1, searchParam = "" }) => {
    const { data } = await api.get("/projects", {
      params: {
        pageNumber,
        searchParam,
      },
    });
    return data;
  },

  create: async (data) => {
    const { data: project } = await api.post("/projects", data);
    return project;
  },

  update: async (id, data) => {
    const { data: project } = await api.put(`/projects/${id}`, data);
    return project;
  },

  delete: async (id) => {
    const { data } = await api.delete(`/projects/${id}`);
    return data;
  },
};

export default projectsService;
