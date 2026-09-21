/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios, { AxiosError } from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { callTelegramApi, shouldUseTelegramPolling } from "./telegramApi";
import { getBotToken } from "./sendTelegramMessage";
import { handleTelegramInbound } from "./telegramInboundListener";

const TELEGRAM_API = "https://api.telegram.org";

type PollerState = {
  running: boolean;
  offset: number;
  token: string;
  abortController: AbortController;
  recovering409: boolean;
};

const activePollers = new Map<number, PollerState>();
const tokenToConnectionId = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTelegram409(err: unknown): boolean {
  const ax = err as AxiosError<{ description?: string }>;
  if (ax?.response?.status === 409) return true;
  const desc = String(
    ax?.response?.data?.description || (err as Error)?.message || ""
  );
  return /conflict|terminated by other getupdates/i.test(desc);
}

export async function getTelegramWebhookStatus(token: string): Promise<{
  url?: string;
  pendingUpdateCount?: number;
}> {
  try {
    return await callTelegramApi(token, "getWebhookInfo", {});
  } catch {
    return {};
  }
}

/** Remove webhook e libera getUpdates (conflito com Railway/outro processo). */
export async function ensureTelegramPollingReady(token: string): Promise<void> {
  const info = await getTelegramWebhookStatus(token);
  if (info?.url) {
    logger.info(`[TELEGRAM] Removendo webhook ativo: ${info.url}`);
  }

  await callTelegramApi(token, "deleteWebhook", {
    drop_pending_updates: false
  });
  await sleep(1200);
}

async function fetchUpdates(
  token: string,
  offset: number,
  longPoll: boolean,
  signal?: AbortSignal
): Promise<Array<Record<string, unknown>>> {
  const url = `${TELEGRAM_API}/bot${token}/getUpdates`;
  const { data } = await axios.post(
    url,
    {
      offset,
      timeout: longPoll ? 25 : 0,
      allowed_updates: ["message", "edited_message", "callback_query"]
    },
    {
      timeout: longPoll ? 35000 : 15000,
      signal
    }
  );
  if (!data?.ok) {
    throw new Error(data?.description || "getUpdates falhou");
  }
  return (data.result || []) as Array<Record<string, unknown>>;
}

async function applyUpdates(
  connection: Whatsapp,
  connectionId: number,
  updates: Array<Record<string, unknown>>
): Promise<number> {
  const state = activePollers.get(connectionId);
  if (!state) return 0;

  let count = 0;
  for (const update of updates) {
    const updateId = Number(update.update_id);
    if (Number.isFinite(updateId) && updateId >= state.offset) {
      state.offset = updateId + 1;
    }
    logger.info(
      `[TELEGRAM] Polling inbound connection=${connectionId} update_id=${update.update_id ?? "?"}`
    );
    await handleTelegramInbound(connection, update as any);
    count += 1;
  }
  return count;
}

/** Busca mensagens pendentes na fila do Telegram (sem esperar long poll). */
export async function drainPendingTelegramUpdates(
  connectionId: number
): Promise<number> {
  const state = activePollers.get(connectionId);
  if (!state?.running) return 0;

  const connection = await Whatsapp.findOne({
    where: { id: connectionId, channel: "telegram" }
  });
  if (!connection?.token?.trim()) return 0;

  const token = getBotToken(connection);
  let total = 0;

  for (let round = 0; round < 30; round++) {
    let updates: Array<Record<string, unknown>> = [];
    try {
      updates = await fetchUpdates(token, state.offset, false);
    } catch (err: any) {
      if (isTelegram409(err)) {
        await recoverFrom409(connectionId, token);
        continue;
      }
      logger.warn(
        `[TELEGRAM] drain erro connection=${connectionId}: ${err?.message || err}`
      );
      break;
    }

    if (!updates.length) break;
    total += await applyUpdates(connection, connectionId, updates);
  }

  if (total > 0) {
    logger.info(
      `[TELEGRAM] ${total} mensagem(ns) sincronizada(s) connection=${connectionId}`
    );
  }

  return total;
}

function stopPollerState(connectionId: number): void {
  const state = activePollers.get(connectionId);
  if (!state) return;

  state.running = false;
  try {
    state.abortController.abort();
  } catch {
    /* ignore */
  }

  if (tokenToConnectionId.get(state.token) === connectionId) {
    tokenToConnectionId.delete(state.token);
  }
  activePollers.delete(connectionId);
}

async function recoverFrom409(
  connectionId: number,
  token: string
): Promise<void> {
  const state = activePollers.get(connectionId);
  if (!state || state.recovering409) return;

  state.recovering409 = true;
  logger.warn(
    `[TELEGRAM] Conflito 409 — pare o backend no Railway ou outro PC usando o mesmo bot. connection=${connectionId}`
  );

  try {
    state.abortController.abort();
  } catch {
    /* ignore */
  }

  for (const [cid, s] of activePollers.entries()) {
    if (s.token === token && cid !== connectionId) {
      stopPollerState(cid);
    }
  }

  await ensureTelegramPollingReady(token);
  await sleep(2500);

  state.recovering409 = false;
  state.abortController = new AbortController();
}

async function runPollingLoop(connectionId: number): Promise<void> {
  let idleCycles = 0;

  while (true) {
    const state = activePollers.get(connectionId);
    if (!state?.running) break;

    const connection = await Whatsapp.findOne({
      where: { id: connectionId, channel: "telegram" }
    });

    if (!connection?.token?.trim()) {
      stopTelegramPolling(connectionId);
      break;
    }

    if (connection.status !== "CONNECTED") {
      await sleep(3000);
      continue;
    }

    if (state.recovering409) {
      await sleep(500);
      continue;
    }

    let token: string;
    try {
      token = getBotToken(connection);
      state.token = token;
    } catch (err: any) {
      logger.warn(
        `[TELEGRAM] Polling sem token connection=${connectionId}: ${err.message}`
      );
      stopTelegramPolling(connectionId);
      break;
    }

    try {
      const updates = await fetchUpdates(
        token,
        state.offset,
        true,
        state.abortController.signal
      );

      if (!updates.length) {
        idleCycles += 1;
        if (idleCycles % 12 === 1) {
          logger.info(
            `[TELEGRAM] Polling aguardando mensagens connection=${connectionId} bot=${connection.number || connection.name} offset=${state.offset}`
          );
        }
        continue;
      }

      idleCycles = 0;
      await applyUpdates(connection, connectionId, updates);
    } catch (err: any) {
      if (axios.isCancel(err) || err?.code === "ERR_CANCELED") {
        await sleep(300);
        continue;
      }

      if (isTelegram409(err)) {
        await recoverFrom409(connectionId, token);
        continue;
      }

      logger.warn(
        `[TELEGRAM] Polling erro connection=${connectionId}: ${err?.message || err}`
      );
      await sleep(5000);
    }
  }
}

export function isTelegramPollingActive(connectionId: number): boolean {
  return Boolean(activePollers.get(connectionId)?.running);
}

export function stopTelegramPolling(connectionId: number): void {
  if (!activePollers.has(connectionId)) return;
  stopPollerState(connectionId);
  logger.info(`[TELEGRAM] Polling parado connection=${connectionId}`);
}

/** Reinicia ou apenas sincroniza fila pendente (evita parar loop em clique duplo no Webhook). */
export async function restartTelegramPolling(
  connection: Whatsapp
): Promise<number> {
  const token = getBotToken(connection);
  await ensureTelegramPollingReady(token);

  if (isTelegramPollingActive(connection.id)) {
    return drainPendingTelegramUpdates(connection.id);
  }

  await startTelegramPolling(connection);
  await sleep(400);
  return drainPendingTelegramUpdates(connection.id);
}

export async function startTelegramPolling(
  connection: Whatsapp
): Promise<void> {
  const connectionId = connection.id;
  const token = getBotToken(connection);

  const otherConn = tokenToConnectionId.get(token);
  if (otherConn != null && otherConn !== connectionId) {
    logger.info(
      `[TELEGRAM] Encerrando polling duplicado connection=${otherConn} (mesmo bot token)`
    );
    stopTelegramPolling(otherConn);
    await sleep(500);
  }

  if (activePollers.get(connectionId)?.running) {
    await drainPendingTelegramUpdates(connectionId);
    return;
  }

  await ensureTelegramPollingReady(token);

  const abortController = new AbortController();
  activePollers.set(connectionId, {
    running: true,
    offset: 0,
    token,
    abortController,
    recovering409: false
  });
  tokenToConnectionId.set(token, connectionId);

  void runPollingLoop(connectionId);

  logger.info(
    `[TELEGRAM] Polling ativo (dev/local) connection=${connectionId} bot=${connection.number || connection.name}`
  );

  await sleep(300);
  await drainPendingTelegramUpdates(connectionId);
}

export async function startAllTelegramPollingSessions(): Promise<void> {
  if (!shouldUseTelegramPolling()) {
    return;
  }

  const connections = await Whatsapp.findAll({
    where: { channel: "telegram", status: "CONNECTED" }
  });

  if (!connections.length) return;

  const seenTokens = new Set<string>();

  logger.info(
    `[TELEGRAM] Dev local — iniciando polling para conexões Telegram`
  );

  for (const connection of connections) {
    try {
      if (!connection.token?.trim()) continue;
      const token = getBotToken(connection);
      if (seenTokens.has(token)) continue;
      seenTokens.add(token);
      await startTelegramPolling(connection);
    } catch (err: any) {
      logger.warn(
        `[TELEGRAM] Falha ao iniciar polling connection=${connection.id}: ${err.message}`
      );
    }
  }
}
