/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from "react";
import api, { openApi } from "../../services/api";
import toastError from "../../errors/toastError";

const useSettings = () => {
  const getAll = useCallback(async (params) => {
    try {
      const { data } = await api.request({
        url: "/settings",
        method: "GET",
        params,
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      toastError(err);
      return [];
    }
  }, []);

  const update = useCallback(async (data) => {
    const { data: responseData } = await api.request({
      url: `/settings/${data.key}`,
      method: "PUT",
      data,
    });
    return responseData;
  }, []);

  const get = useCallback(async (param) => {
    try {
      const { data } = await api.request({
        url: `/setting/${param}`,
        method: "GET",
      });
      return data;
    } catch (err) {
      toastError(err);
      return null;
    }
  }, []);

  const getPublicSetting = useCallback(async (key, companyId = null) => {
    const params = companyId ? { companyId } : {};
    const { data } = await openApi.request({
      url: `/public-settings/${key}`,
      method: "GET",
      params,
    });
    return data;
  }, []);

  return {
    getAll,
    update,
    get,
    getPublicSetting,
  };
};

export default useSettings;
