/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import hmacSHA512 from "crypto-js/hmac-sha512";
import Base64 from "crypto-js/enc-base64";
import { REDIS_URI_CONNECTION } from "../config/redis";

type RedisLike = {
  set: (...args: any[]) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  del: (...keys: string[]) => Promise<number>;
  scanStream: (opts: { match: string; count: number }) => AsyncIterable<string[]>;
  quit?: () => Promise<"OK">;
};

/** Cache em memória quando não há Redis (ex.: DEV_NO_DB). */
function createMemoryRedis(): RedisLike {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  const isExpired = (entry?: { value: string; expiresAt?: number }) =>
    !!(entry?.expiresAt && Date.now() > entry.expiresAt);

  return {
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

  public async set(
    key: string,
    value: string,
    option?: string,
    optionValue?: string | number
  ): Promise<string | null> {
    if (option !== undefined && optionValue !== undefined) {
      return this.redis.set(key, value, option, optionValue);
    }
    return this.redis.set(key, value);
  }

  public async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  public async getKeys(pattern: string): Promise<string[]> {
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
    return this.redis.del(key);
  }

  public async delFromPattern(pattern: string): Promise<void> {
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Redis = require("ioredis");
  return new Redis(REDIS_URI_CONNECTION, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3000,
    lazyConnect: false,
    retryStrategy: () => null
  });
}

const redisInstance = createRedisClient();

export default CacheSingleton.getInstance(redisInstance);
