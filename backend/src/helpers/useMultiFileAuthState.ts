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

export const useMultiFileAuthState = async (
  whatsapp: Whatsapp
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
  if (!whatsapp?.id) {
    console.error("[useMultiFileAuthState] Whatsapp ID is missing!", whatsapp);
    throw new Error("Whatsapp ID is missing");
  }

  const writeData = async (data: any, file: string) => {
    try {
      // console.log(`[useMultiFileAuthState] Writing data for session ${whatsapp.id}: ${file}`);
      await cacheLayer.set(
        `sessions:${whatsapp.id}:${file}`,
        JSON.stringify(data, BufferJSON.replacer)
      );
    } catch (error) {
      console.error(`[useMultiFileAuthState] writeData error for session ${whatsapp.id} file ${file}:`, error);
      return null;
    }
  };

  const readData = async (file: string) => {
    try {
      // console.log(`[useMultiFileAuthState] Reading data for session ${whatsapp.id}: ${file}`);
      const data = await cacheLayer.get(`sessions:${whatsapp.id}:${file}`);
      // if (!data) console.log(`[useMultiFileAuthState] Data not found for session ${whatsapp.id}: ${file}`);
      if (!data) return null;
      return JSON.parse(data, BufferJSON.reviver);
    } catch (error) {
      console.error(`[useMultiFileAuthState] readData error for session ${whatsapp.id} file ${file}:`, error);
      return null;
    }
  };

  const removeData = async (file: string) => {
    try {
      console.log(`[useMultiFileAuthState] Removing data for session ${whatsapp.id}: ${file}`);
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
    saveCreds: () => {
      return writeData(creds, "creds");
    }
  };
};
