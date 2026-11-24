/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import hmacSHA512 from "crypto-js/hmac-sha512";
import Base64 from "crypto-js/enc-base64";
import { REDIS_URI_CONNECTION } from "../config/redis";

type RedisLike = {
  status?: string;
  set: (...args: any[]) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  del: (...keys: string[]) => Promise<number>;
  ping?: () => Promise<string>;
  connect?: () => Promise<void>;
  scanStream: (opts: { match: string; count: number }) => AsyncIterable<string[]>;
  quit?: () => Promise<"OK">;
};

/** Cache em memória quando não há Redis (ex.: DEV_NO_DB). */
function createMemoryRedis(): RedisLike {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  const isExpired = (entry?: { value: string; expiresAt?: number }) =>
    !!(entry?.expiresAt && Date.now() > entry.expiresAt);

  return {
    status: "ready",
    async set(key: string, value: string, option?: string, optionValue?: string | number) {
      let expiresAt: number | undefined;
      if (option === "EX" && optionValue != null) {
        expiresAt = Date.now() + Number(optionValue) * 1000;
      }
      if (option === "NX" && store.has(key) && !isExpired(store.get(key))) {
        return null;
      }
      store.set(key, { value: String(value), expiresAt });
      return "OK";
    },
    async get(key: string) {
      const entry = store.get(key);
      if (!entry || isExpired(entry)) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const key of keys) {
        if (store.delete(key)) n += 1;
      }
      return n;
    },
    async ping() {
      return "PONG";
    },
    scanStream({ match }: { match: string; count: number }) {
      const pattern = new RegExp(
        `^${match.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`
      );
      const keys = [...store.keys()].filter(k => pattern.test(k));
      return {
        async *[Symbol.asyncIterator]() {
          if (keys.length) yield keys;
        }
      };
    },
    async quit() {
      store.clear();
      return "OK";
    }
  };
}

class CacheSingleton {
  private redis: RedisLike;

  private static instance: CacheSingleton;

  private readyPromise: Promise<boolean> | null = null;

  private constructor(redisInstance: RedisLike) {
    this.redis = redisInstance;
  }

  public static getInstance(redisInstance: RedisLike): CacheSingleton {
    if (!CacheSingleton.instance) {
      CacheSingleton.instance = new CacheSingleton(redisInstance);
    }
    return CacheSingleton.instance;
  }

  private static encryptParams(params: any) {
    const str = JSON.stringify(params);
    const key = Base64.stringify(hmacSHA512(params, str));
    return key;
  }

  /**
   * Garante Redis pronto antes de ler/gravar sessões Baileys.
   * Sem isso o pairing trava em "Conectando..." (creds não persistem).
   */
  public async ensureReady(timeoutMs = 8000): Promise<boolean> {
    if (this.redis.status === "ready") {
      try {
        if (this.redis.ping) {
          const pong = await this.redis.ping();
          return pong === "PONG";
        }
        return true;
      } catch {
        /* tenta reconectar abaixo */
      }
    }

    if (!this.readyPromise) {
      this.readyPromise = (async () => {
        try {
          if (typeof this.redis.connect === "function" && this.redis.status !== "ready") {
            await Promise.race([
              this.redis.connect(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("redis connect timeout")), timeoutMs)
              )
            ]);
          }
          if (this.redis.ping) {
            const pong = await this.redis.ping();
            return pong === "PONG";
          }
          return this.redis.status === "ready";
        } catch (err: any) {
          console.warn(
            "[RedisConnection] ensureReady falhou:",
            err?.message || err
          );
          return false;
        } finally {
          this.readyPromise = null;
        }
      })();
    }

    return this.readyPromise;
  }

  public async set(
    key: string,
    value: string,
    option?: string,
    optionValue?: string | number
  ): Promise<string | null> {
    await this.ensureReady();
    if (option !== undefined && optionValue !== undefined) {
      return this.redis.set(key, value, option, optionValue);
    }
    return this.redis.set(key, value);
  }

  public async get(key: string): Promise<string | null> {
    await this.ensureReady();
    return this.redis.get(key);
  }

  public async getKeys(pattern: string): Promise<string[]> {
    await this.ensureReady();
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100
    });
    const keys: string[] = [];
    for await (const resultKeys of stream) {
      keys.push(...resultKeys);
    }
    return keys;
  }

  public async del(key: string): Promise<number> {
    await this.ensureReady();
    return this.redis.del(key);
  }

  public async delFromPattern(pattern: string): Promise<void> {
    await this.ensureReady();
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100
    });

    for await (const resultKeys of stream) {
      if (resultKeys.length > 0) {
        await this.redis.del(...resultKeys);
      }
    }
  }

  public async setFromParams(
    key: string,
    params: any,
    value: string,
    option?: string,
    optionValue?: string | number
  ): Promise<string | null> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    if (option !== undefined && optionValue !== undefined) {
      return this.set(finalKey, value, option, optionValue);
    }
    return this.set(finalKey, value);
  }

  public async getFromParams(key: string, params: any): Promise<string | null> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    return this.get(finalKey);
  }

  public async delFromParams(key: string, params: any): Promise<number> {
    const finalKey = `${key}:${CacheSingleton.encryptParams(params)}`;
    return this.del(finalKey);
  }

  public getRedisInstance(): RedisLike {
    return this.redis;
  }
}

function createRedisClient(): RedisLike {
  if (!REDIS_URI_CONNECTION) {
    return createMemoryRedis();
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require("ioredis");
    const client = new Redis(REDIS_URI_CONNECTION, {
      // Fila offline ON: pairing Baileys grava dezenas de keys — sem fila, creds somem e o celular trava em "Conectando..."
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 20) return null;
        return Math.min(times * 200, 3000);
      }
    });
    client.on("error", (err: Error) => {
      console.warn("[RedisConnection] erro (ignorado):", err?.message || err);
    });
    client.on("connect", () => {
      console.info("[RedisConnection] conectado");
    });
    client.on("ready", () => {
      console.info("[RedisConnection] ready");
    });
    client.connect().catch((err: Error) => {
      console.warn(
        "[RedisConnection] connect inicial falhou (retry automático):",
        err?.message || err
      );
    });
    return client;
  } catch (err: any) {
    console.warn(
      "[RedisConnection] indisponível — cache em memória:",
      err?.message || err
    );
    return createMemoryRedis();
  }
}

const redisInstance = createRedisClient();

export default CacheSingleton.getInstance(redisInstance);
