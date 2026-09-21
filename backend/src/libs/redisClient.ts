/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from '../utils/logger';

class InMemoryRedis {
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();

  async setex(key: string, seconds: number, value: string): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (seconds * 1000)
    });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<number> {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    return existed ? 1 : 0;
  }

  async exists(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return 0;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return 0;
    }
    return 1;
  }

  /**
   * Compatível com ioredis: SET key value EX sec NX → "OK" | null se NX e já existir.
   */
  async set(
    key: string,
    value: string,
    ...args: Array<string | number>
  ): Promise<'OK' | null> {
    let exSeconds: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i += 1) {
      const a = args[i];
      if (a === 'EX' && typeof args[i + 1] === 'number') {
        exSeconds = args[i + 1] as number;
        i += 1;
      } else if (a === 'NX') {
        nx = true;
      }
    }
    if (nx && (await this.exists(key)) === 1) {
      return null;
    }
    const expiresAt =
      exSeconds != null
        ? Date.now() + exSeconds * 1000
        : Number.MAX_SAFE_INTEGER;
    this.cache.set(key, { value, expiresAt });
    return 'OK';
  }

  async info(_section?: string): Promise<string> {
    return '# Memory\r\nused_memory:0\r\n';
  }

  on(event: string, callback: any): void { }
}

const inMemoryClient = new InMemoryRedis();
logger.info('[RedisConnection] Usando cache em memória (desenvolvimento local)');

export const redisClient = inMemoryClient;
