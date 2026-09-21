/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import { getBackendUrl } from "../config";
import { isOfflineMode } from "./offlineMode";
import {
  resolveOfflineRequest,
  buildAxiosAdapterResponse,
  isOfflineNetworkPath,
} from "./offlineApiAdapter";

const baseURL = getBackendUrl();

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000
});

export const openApi = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000
});

function attachOfflineAdapter(instance) {
  instance.interceptors.request.use((config) => {
    if (!isOfflineMode()) return config;

    const data = resolveOfflineRequest(config);
    if (data === undefined) return config;

    config.adapter = () =>
      Promise.resolve(buildAxiosAdapterResponse(config, data));
    return config;
  });
}

attachOfflineAdapter(api);
attachOfflineAdapter(openApi);

const shouldRetry = (error) => {
  if (isOfflineMode()) return false;
  const cfg = error?.config || {};
  const method = String(cfg.method || "get").toLowerCase();
  const isGet = method === "get";
  const isTimeout = error?.code === "ECONNABORTED";
  const isNetwork = error?.message === "Network Error";
  return isGet && (isTimeout || isNetwork) && (cfg.__retryCount || 0) < 1;
};

const scheduleRetry = (config) =>
  new Promise((resolve) => {
    const retryAfter = 1000;
    setTimeout(() => resolve({ ...config, __retryCount: (config.__retryCount || 0) + 1, timeout: Math.max(config.timeout || 0, 25000) }), retryAfter);
  });

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (isOfflineMode()) {
      const cfg = error?.config || {};
      if (isOfflineNetworkPath(cfg.url || "")) {
        return Promise.reject(error);
      }
      const fallback = resolveOfflineRequest(cfg) ?? {
        records: [],
        count: 0,
        hasMore: false,
      };
      return buildAxiosAdapterResponse(cfg, fallback);
    }
    if (shouldRetry(error)) {
      const nextCfg = await scheduleRetry(error.config);
      return api.request(nextCfg);
    }
    if (
      error?.response?.status === 402 &&
      error?.response?.data?.error === "ERR_SUBSCRIPTION_EXPIRED" &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/financeiro-aberto"
    ) {
      window.location.assign("/financeiro-aberto");
    }
    return Promise.reject(error);
  }
);

openApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (isOfflineMode()) {
      const cfg = error?.config || {};
      if (isOfflineNetworkPath(cfg.url || "")) {
        return Promise.reject(error);
      }
      const fallback = resolveOfflineRequest(cfg) ?? {};
      return buildAxiosAdapterResponse(cfg, fallback);
    }
    if (shouldRetry(error)) {
      const nextCfg = await scheduleRetry(error.config);
      return openApi.request(nextCfg);
    }
    return Promise.reject(error);
  }
);

export default api;
