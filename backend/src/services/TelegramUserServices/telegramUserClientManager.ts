/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { computeCheck } from "telegram/Password";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import AppError from "../../errors/AppError";
import {
  getTelegramUserCredentials,
  normalizePhoneE164
} from "./telegramUserCredentials";
import {
  clearPendingTelegramUserAuth,
  getPendingTelegramUserAuth,
  releasePendingTelegramUserAuth,
  setPendingTelegramUserAuth
} from "./telegramUserAuthStore";
import {
  clearPairingMeta,
  getPairingMetaOrThrow,
  savePairingMeta
} from "./telegramUserPairing";
import { processGramJsNewMessage } from "./telegramUserInboundListener";
import { getIO } from "../../libs/socket";
import { companySocketNamespace } from "../TelegramServices/emitTelegramTicketSocket";

const activeClients = new Map<number, TelegramClient>();
const updateCounters = new Map<number, { value: number }>();

function buildClient(
  apiId: number,
  apiHash: string,
  sessionString: string,
  forAuth = false
): TelegramClient {
  const client = new TelegramClient(
    new StringSession(sessionString || ""),
    apiId,
    apiHash,
    {
      connectionRetries: 3,
      useWSS: false,
      autoReconnect: !forAuth,
      requestRetries: 3
    }
  );
  if (!forAuth) {
    wireTelegramClientResilience(client, 0);
  }
  return client;
}

/** Evita spam de Error: TIMEOUT no console do GramJS (ping da conexão). */
function wireTelegramClientResilience(
  client: TelegramClient,
  connectionId: number
): void {
  const c = client as TelegramClient & {
    _errorHandler?: (err: Error) => Promise<void>;
  };
  c._errorHandler = async (err: Error) => {
    const msg = String(err?.message || err);
    if (/TIMEOUT/i.test(msg)) {
      return;
    }
    logger.warn(
      `[TELEGRAM_USER] client error connection=${connectionId}: ${msg}`
    );
  };
}

async function safeDisconnectClient(client: TelegramClient | undefined): Promise<void> {
  if (!client) return;
  try {
    await client.disconnect();
  } catch {
    /* ignore */
  }
}

export async function disconnectTelegramUserClient(
  connectionId: number
): Promise<void> {
  clearPendingTelegramUserAuth(connectionId);
  const client = activeClients.get(connectionId);
  await safeDisconnectClient(client);
  activeClients.delete(connectionId);
  updateCounters.delete(connectionId);
}

async function attachInboundListener(
  connection: Whatsapp,
  client: TelegramClient
): Promise<void> {
  const connectionId = connection.id;
  if (!updateCounters.has(connectionId)) {
    updateCounters.set(connectionId, { value: Date.now() % 100000 });
  }
  const counter = updateCounters.get(connectionId)!;

  client.addEventHandler(
    async (event: { message: any }) => {
      const fresh = await Whatsapp.findOne({
        where: { id: connectionId, channel: "telegram_oficial" }
      });
      if (!fresh || fresh.status !== "CONNECTED") return;
      await processGramJsNewMessage(fresh, event, counter);
    },
    new NewMessage({})
  );
}

export async function startTelegramUserClient(
  connection: Whatsapp
): Promise<void> {
  if (connection.channel !== "telegram_oficial") {
    throw new AppError("Conexão não é Telegram Oficial (userbot).", 400);
  }

  const { apiId, apiHash, phone } = getTelegramUserCredentials(connection);
  const sessionStr = String(connection.session || "").trim();

  if (!sessionStr) {
    throw new AppError(
      "Sessão MTProto não configurada. Conclua o login com código SMS.",
      400
    );
  }

  await disconnectTelegramUserClient(connection.id);

  const client = buildClient(apiId, apiHash, sessionStr, false);
  wireTelegramClientResilience(client, connection.id);
  await client.connect();

  if (!(await client.isUserAuthorized())) {
    await client.disconnect();
    throw new AppError(
      "Sessão expirada. Envie um novo código em Conexões → Telegram Oficial.",
      400
    );
  }

  const me = await client.getMe();
  const label = me?.username
    ? `@${me.username}`
    : me?.firstName || phone;

  await connection.update({
    status: "CONNECTED",
    number: label,
    phone_number: normalizePhoneE164(phone),
    facebookUserId: String(apiId),
    token: apiHash
  });

  activeClients.set(connection.id, client);
  await attachInboundListener(connection, client);

  logger.info(
    `[TELEGRAM_USER] Sessão ativa connection=${connection.id} user=${label}`
  );
}

export async function sendTelegramUserLoginCode(
  connection: Whatsapp
): Promise<{ phoneCodeHash: string; message: string }> {
  const { apiId, apiHash, phone } = getTelegramUserCredentials(connection);
  const normalized = normalizePhoneE164(phone);

  const existingActive = activeClients.get(connection.id);
  await safeDisconnectClient(existingActive);
  activeClients.delete(connection.id);
  clearPendingTelegramUserAuth(connection.id);

  const client = buildClient(apiId, apiHash, "", true);
  wireTelegramClientResilience(client, connection.id);
  await client.connect();

  const result = await client.sendCode({ apiId, apiHash }, normalized);

  setPendingTelegramUserAuth({
    connectionId: connection.id,
    phone: normalized,
    phoneCodeHash: result.phoneCodeHash,
    client,
    createdAt: Date.now()
  });

  await savePairingMeta(connection, {
    phoneCodeHash: result.phoneCodeHash,
    phone: normalized,
    apiId
  });

  await connection.update({ phone_number: normalized });

  logger.info(
    `[TELEGRAM_USER] Código solicitado connection=${connection.id} phone=${normalized} (cliente MTProto aguardando sign-in)`
  );

  return {
    phoneCodeHash: result.phoneCodeHash,
    message:
      "Código enviado. Use somente o último código recebido no Telegram e confirme em até 15 minutos."
  };
}

async function completeSignIn(
  client: TelegramClient,
  phone: string,
  phoneCodeHash: string,
  trimmedCode: string,
  password?: string
): Promise<void> {
  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: trimmedCode
      })
    );
  } catch (err: any) {
    const msg = String(err?.message || err);
    const errCode = String(err?.code || err?.errorMessage || "");
    logger.warn(`[TELEGRAM_USER] auth.SignIn falhou: ${msg} code=${errCode}`);

    const needs2fa =
      /SESSION_PASSWORD_NEEDED|PASSWORD_HASH_INVALID|2FA|password/i.test(msg) ||
      /SESSION_PASSWORD_NEEDED/i.test(errCode);
    if (needs2fa) {
      if (!password?.trim()) {
        throw new AppError(
          "Esta conta tem verificação em duas etapas. Informe a senha 2FA.",
          400
        );
      }
      const passwordRequest = await client.invoke(new Api.account.GetPassword());
      const pwd = await computeCheck(passwordRequest, password.trim());
      await client.invoke(new Api.auth.CheckPassword({ password: pwd }));
    } else if (/PHONE_CODE_EXPIRED/i.test(msg) || /PHONE_CODE_EXPIRED/i.test(errCode)) {
      throw new AppError(
        "Este código expirou no Telegram. Clique em Enviar código e use o novo código (só o último vale).",
        400
      );
    } else if (
      /PHONE_CODE_INVALID/i.test(msg) ||
      /PHONE_CODE_INVALID/i.test(errCode)
    ) {
      throw new AppError(
        "Código não confere com o último envio. Clique em Enviar código de novo e use só o código mais recente do app Telegram.",
        400
      );
    } else {
      throw new AppError(`Falha ao validar código: ${msg}`, 400);
    }
  }
}

export async function confirmTelegramUserLogin(
  connection: Whatsapp,
  code: string,
  password?: string
): Promise<Whatsapp> {
  const trimmedCode = String(code || "").trim().replace(/\s/g, "");
  if (!trimmedCode) {
    throw new AppError("Informe o código recebido no Telegram.", 400);
  }

  await connection.reload();
  const pairing = getPairingMetaOrThrow(connection);
  const { apiId, apiHash } = getTelegramUserCredentials(connection);

  const pending = getPendingTelegramUserAuth(connection.id);
  let client: TelegramClient;
  let phone = pairing.phone;
  let phoneCodeHash = pairing.phoneCodeHash;

  if (pending?.client) {
    client = pending.client;
    phone = pending.phone;
    phoneCodeHash = pending.phoneCodeHash;
    wireTelegramClientResilience(client, connection.id);
    if (!client.connected) {
      await client.connect();
    }
    logger.info(
      `[TELEGRAM_USER] SignIn com cliente pendente connection=${connection.id}`
    );
  } else {
    logger.warn(
      `[TELEGRAM_USER] Cliente pendente ausente (reinício do servidor?). connection=${connection.id}`
    );
    client = buildClient(apiId, apiHash, "", true);
    wireTelegramClientResilience(client, connection.id);
    await client.connect();
  }

  try {
    await completeSignIn(
      client,
      phone,
      phoneCodeHash,
      trimmedCode,
      password
    );
  } catch (err) {
    if (!pending?.client) {
      await safeDisconnectClient(client);
    }
    throw err;
  }

  const sessionString = client.session.save() as unknown as string;
  releasePendingTelegramUserAuth(connection.id);
  await clearPairingMeta(connection);

  const me = await client.getMe();
  const label = me?.username
    ? `@${me.username}`
    : me?.firstName || pairing.phone;

  await connection.update({
    session: sessionString,
    status: "CONNECTED",
    facebookUserId: String(apiId),
    token: apiHash,
    number: label,
    phone_number: pairing.phone
  });

  const reloaded = await connection.reload();
  activeClients.set(connection.id, client);
  wireTelegramClientResilience(client, connection.id);
  await attachInboundListener(reloaded, client);

  const io = getIO();
  const emitted = await reloaded.reload();
  const socketPayload = emitted.toJSON() as Record<string, unknown>;
  delete socketPayload.session;
  delete socketPayload.tokenMeta;
  socketPayload.hasMtprotoSession = true;

  io.of(companySocketNamespace(reloaded.companyId)).emit(
    `company-${reloaded.companyId}-whatsapp`,
    { action: "update", whatsapp: socketPayload }
  );

  logger.info(
    `[TELEGRAM_USER] Login OK connection=${reloaded.id} user=${label}`
  );

  return reloaded.reload();
}

export function getActiveTelegramUserClient(
  connectionId: number
): TelegramClient | undefined {
  return activeClients.get(connectionId);
}
