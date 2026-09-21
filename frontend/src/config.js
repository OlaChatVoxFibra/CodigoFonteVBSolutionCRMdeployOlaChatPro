/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

function getConfig(name, defaultValue = null) {
    // If inside a docker container, use window.ENV
    if (window.ENV !== undefined) {
        return window.ENV[name] || defaultValue;
    }

    return process.env[name] || defaultValue;
}

/** Alinhado a `frontend/scripts/start-backend.js` (PORT=3000) e `npm run dev`. */
export const DEFAULT_BACKEND_URL = "http://localhost:3000";

function normalizeBackendUrl(input) {
    let url = (input || "").trim();
    if (!url) return "";
    if (/^wss?:\/\//i.test(url)) {
        url = url.replace(/^ws/i, "http");
    }
    if (/^https?:\/\//i.test(url)) {
        return url.replace(/\/+$/, "");
    }
    if (/^[\w.-]+(?::\d+)?(\/.*)?$/.test(url)) {
        return `http://${url}`.replace(/\/+$/, "");
    }
    try {
        const abs = new URL(url, typeof window !== "undefined" ? window.location.origin : DEFAULT_BACKEND_URL);
        return abs.origin.replace(/\/+$/, "");
    } catch {
        return "";
    }
}

export function getBackendUrl() {
    const raw = (getConfig("REACT_APP_BACKEND_URL") || "").trim();
    if (!raw) {
        return DEFAULT_BACKEND_URL;
    }
    const normalized = normalizeBackendUrl(raw);
    return normalized || DEFAULT_BACKEND_URL;
}

/**
 * Arquivo salvo em /public (ex.: companies/1/logo.png) ou URL absoluta.
 * Garante URL final estável em qualquer dispositivo (sempre relativo ao backend da conta).
 */
export function resolvePublicUploadUrl(fileOrUrl) {
    if (fileOrUrl == null) return "";
    if (typeof fileOrUrl === "object") return "";
    const s = String(fileOrUrl).trim();
    if (!s || s === "[object Object]") return "";
    if (/^(data:|blob:|https?:\/\/)/i.test(s)) return s;
    const base = getBackendUrl().replace(/\/+$/, "");
    /** Bundles do próprio front (CRA/Vite): não prefixar com API */
    if (s.startsWith("/static/") || s.startsWith("/assets/")) {
        if (typeof window !== "undefined" && window.location && window.location.origin) {
            return `${window.location.origin}${s}`;
        }
        return s;
    }
    if (s.startsWith("/")) return `${base}${s}`;
    const normalized = s.replace(/^public\//i, "");
    return `${base}/public/${normalized}`;
}

export function getHoursCloseTicketsAuto() {
    return getConfig('REACT_APP_HOURS_CLOSE_TICKETS_AUTO');
}

export function getFrontendPort() {
    return getConfig('SERVER_PORT');
}

export function getPrimaryColor() {
    return getConfig("REACT_APP_PRIMARY_COLOR");
}

export function getPrimaryDark() {
    return getConfig("REACT_APP_PRIMARY_DARK");
}

export function getNumberSupport() {
    return getConfig("REACT_APP_NUMBER_SUPPORT");
}
