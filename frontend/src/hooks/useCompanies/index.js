/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from "react";
import api from "../../services/api";

const useCompanies = () => {
  const save = useCallback(async (data) => {
    const { data: responseData } = await api.request({
      url: "/companies",
      method: "POST",
      data
    });
    return responseData;
  }, []);

  const findAll = useCallback(async () => {
    const { data } = await api.request({
      url: `/companies`,
      method: "GET"
    });
    return data;
  }, []);

  const list = useCallback(async (params) => {
    const { data } = await api.request({
      url: `/companies/list`,
      method: "GET",
      params: params || {}
    });
    return data;
  }, []);

  const find = useCallback(async (id) => {
    const { data } = await api.request({
      url: `/companies/${id}`,
      method: "GET"
    });
    return data;
  }, []);

  const update = useCallback(async (data) => {
    const { data: responseData } = await api.request({
      url: `/companies/${data.id}`,
      method: "PUT",
      data
    });
    return responseData;
  }, []);

  const remove = useCallback(async (id) => {
    const { data } = await api.request({
      url: `/companies/${id}`,
      method: "DELETE"
    });
    return data;
  }, []);

  const updateSchedules = useCallback(async (data) => {
    const { data: responseData } = await api.request({
      url: `/companies/${data.id}/schedules`,
      method: "PUT",
      data
    });
    return responseData;
  }, []);

  return {
    save,
    update,
    remove,
    list,
    find,
    findAll,
    updateSchedules
  };
};

export default useCompanies;
