/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import cache from "../../libs/cache";
import logger from "../../utils/logger";

const PREFIX = "mcp:oauth:";

async function redisGet(key: string): Promise<string | null> {
  try {
    return await cache.get(`${PREFIX}${key}`);
  } catch (err) {
    logger.warn({ err, key }, "[MCP OAuth] Redis get failed");
    return null;
  }
}

async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await cache.set(`${PREFIX}${key}`, value, "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "[MCP OAuth] Redis set failed");
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    await cache.del(`${PREFIX}${key}`);
  } catch (err) {
    logger.warn({ err, key }, "[MCP OAuth] Redis del failed");
  }
}

const memory = new Map<string, { value: string; expiresAt: number }>();

function memoryGet(key: string): string | null {
  const row = memory.get(key);
  if (!row) return null;
  if (row.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return row.value;
}

function memorySet(key: string, value: string, ttlSeconds: number): void {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryDel(key: string): void {
  memory.delete(key);
}

export async function mcpOAuthStoreGet(key: string): Promise<string | null> {
  const fromRedis = await redisGet(key);
  if (fromRedis) return fromRedis;
  return memoryGet(key);
}

export async function mcpOAuthStoreSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  memorySet(key, value, ttlSeconds);
  await redisSet(key, value, ttlSeconds);
}

export async function mcpOAuthStoreDel(key: string): Promise<void> {
  memoryDel(key);
  await redisDel(key);
}
