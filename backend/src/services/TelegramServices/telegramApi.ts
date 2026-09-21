/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import AppError from "../../errors/AppError";

const TELEGRAM_API = "https://api.telegram.org";

/** Base pública do backend (ngrok/produção). TELEGRAM_WEBHOOK_URL sobrescreve BACKEND_URL. */
export function resolveTelegramWebhookBaseUrl(): string {
  const base =
    process.env.TELEGRAM_WEBHOOK_URL ||
    process.env.BACKEND_URL ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  return base.replace(/\/$/, "");
}

/** Telegram só entrega webhook em HTTPS acessível na internet (não localhost). */
export function isPublicHttpsTelegramDelivery(): boolean {
  const base = resolveTelegramWebhookBaseUrl();
  if (!/^https:\/\//i.test(base)) return false;
  if (/localhost|127\.0\.0\.1/i.test(base)) return false;
  try {
    return new URL(base).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Em dev local o BACKEND_URL costuma apontar para Railway/produção: o webhook
 * registra lá e este processo nunca recebe updates. Polling roda neste Node.
 */
export function shouldUseTelegramPolling(): boolean {
  if (process.env.TELEGRAM_FORCE_POLLING === "true") return true;
  if (process.env.TELEGRAM_DISABLE_POLLING === "true") return false;

  const env = (process.env.NODE_ENV || "").toLowerCase();
  if (env === "production") {
    return !isPublicHttpsTelegramDelivery();
  }

  // development / test / NODE_ENV vazio (npm run dev)
  return true;
}

export function buildTelegramWebhookUrl(
  companyId: number,
  connectionId: number
): string {
  return `${resolveTelegramWebhookBaseUrl()}/v1/telegram/webhook/${companyId}/${connectionId}`;
}

export async function callTelegramApi<T = any>(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>
): Promise<T> {
  const url = `${TELEGRAM_API}/bot${botToken}/${method}`;
  try {
    const { data } = await axios.post(url, payload || {}, { timeout: 30000 });
    if (!data?.ok) {
      throw new AppError(
        `Telegram: ${data?.description || "Erro na API do Telegram"}`,
        400
      );
    }
    return data.result as T;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    const desc =
      err?.response?.data?.description ||
      err?.message ||
      "Erro na API do Telegram";
    throw new AppError(`Telegram: ${desc}`, 400);
  }
}

export async function getTelegramBotInfo(botToken: string): Promise<{
  id: number;
  username?: string;
  first_name?: string;
}> {
  return callTelegramApi(botToken, "getMe");
}
