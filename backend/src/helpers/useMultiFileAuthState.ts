/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { proto } from "baileys";
import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap
} from "baileys";
import { initAuthCreds } from "baileys";
import { BufferJSON } from "baileys";
import cacheLayer from "../libs/cache";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useMultiFileAuthState = async (
  whatsapp: Whatsapp
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  if (!whatsapp?.id) {
    console.error("[useMultiFileAuthState] Whatsapp ID is missing!", whatsapp);
    throw new Error("Whatsapp ID is missing");
  }

  const redisReady = await cacheLayer.ensureReady(10000);
  if (!redisReady) {
    logger.error(
      `[useMultiFileAuthState] Redis indisponível para sessão ${whatsapp.id} — pairing pode falhar`
    );
  }

  const writeData = async (data: any, file: string) => {
    const key = `sessions:${whatsapp.id}:${file}`;
    const payload = JSON.stringify(data, BufferJSON.replacer);
    let lastError: any;

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await cacheLayer.set(key, payload);
        return;
      } catch (error) {
        lastError = error;
        logger.warn(
          `[useMultiFileAuthState] writeData tentativa ${attempt}/4 falhou (${whatsapp.id}/${file}): ${
            (error as Error)?.message || error
          }`
        );
        await sleep(150 * attempt);
        await cacheLayer.ensureReady(5000);
      }
    }

    logger.error(
      `[useMultiFileAuthState] writeData FALHOU após retries para ${whatsapp.id}/${file}:`,
      lastError
    );
    throw lastError || new Error(`Failed to persist Baileys auth key ${file}`);
  };

  const readData = async (file: string) => {
    try {
      const data = await cacheLayer.get(`sessions:${whatsapp.id}:${file}`);
      if (!data) return null;
      return JSON.parse(data, BufferJSON.reviver);
    } catch (error) {
      console.error(
        `[useMultiFileAuthState] readData error for session ${whatsapp.id} file ${file}:`,
        error
      );
      return null;
    }
  };

  const removeData = async (file: string) => {
    try {
      await cacheLayer.del(`sessions:${whatsapp.id}:${file}`);
    } catch {}
  };

  const creds: AuthenticationCreds =
    (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async id => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }

              data[id] = value;
            })
          );

          return data;
        },
        set: async data => {
          const tasks: Promise<void>[] = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }

          await Promise.all(tasks);
        }
      }
    },
    saveCreds: async () => {
      await writeData(creds, "creds");
    }
  };
};
