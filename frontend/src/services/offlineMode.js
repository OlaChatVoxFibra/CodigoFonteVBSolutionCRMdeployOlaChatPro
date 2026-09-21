/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const FLAG_KEY = "vbs_offline_mode";

export function isOfflineMode() {
  if (typeof window === "undefined") return false;
  if (window.__VBS_OFFLINE_MODE__ === true) return true;
  try {
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOfflineMode(enabled) {
  if (typeof window === "undefined") return;
  window.__VBS_OFFLINE_MODE__ = !!enabled;
  try {
    if (enabled) localStorage.setItem(FLAG_KEY, "1");
    else localStorage.removeItem(FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Detecta DEV_NO_DB no backend e sincroniza o modo localStorage.
 * Se o backend responder enabled:false, limpa a flag sticky.
 */
export async function detectAndEnableOfflineMode(openApiClient) {
  // Em localhost, habilita de imediato para a UI não travar enquanto o status carrega.
  try {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    if (host === "localhost" || host === "127.0.0.1") {
      setOfflineMode(true);
    }
  } catch {
    /* ignore */
  }

  try {
    const { data } = await openApiClient.get("/auth/offline-status", {
      timeout: 4000,
    });
    if (data?.enabled) {
      setOfflineMode(true);
      return true;
    }
    setOfflineMode(false);
    return false;
  } catch {
    /* backend inacessível: em localhost mantém offline (DEV_NO_DB) */
    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      if (host === "localhost" || host === "127.0.0.1") {
        setOfflineMode(true);
      }
    } catch {
      /* ignore */
    }
  }
  return isOfflineMode();
}

export default {
  isOfflineMode,
  setOfflineMode,
  detectAndEnableOfflineMode,
};
