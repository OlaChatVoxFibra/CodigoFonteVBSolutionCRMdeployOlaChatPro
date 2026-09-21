/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

function isDevNoDbEnv(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = String(process.env.DEV_NO_DB || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

const legacyRedisUser = process.env.REDISUSER || process.env.REDIS_USERNAME || "";
const legacyRedisPassword = process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || "";
const legacyRedisHost = process.env.REDISHOST || process.env.REDIS_HOST || "";
const legacyRedisPort = process.env.REDISPORT || process.env.REDIS_PORT || "";

const legacyRedisUri =
  legacyRedisHost && legacyRedisPort && legacyRedisUser
    ? `redis://${legacyRedisUser}:${legacyRedisPassword}@${legacyRedisHost}:${legacyRedisPort}`
    : "";

const redisPrimaryUri = isDevNoDbEnv()
  ? ""
  : process.env.REDIS_URI ||
    process.env.REDIS_PUBLIC_URL ||
    process.env.REDIS_URL ||
    process.env.REDIS_PRIVATE_URL ||
    process.env.IO_REDIS_SERVER ||
    legacyRedisUri ||
    "";

export const REDIS_URI_CONNECTION = redisPrimaryUri;
export const REDIS_OPT_LIMITER_MAX = process.env.REDIS_OPT_LIMITER_MAX || 1;
export const REDIS_OPT_LIMITER_DURATION = process.env.REDIS_OPT_LIMITER_DURATION || 3000;
export const REDIS_SECRET_KEY = process.env.REDIS_SECRET_KEY || "WCHAT";
export const REDIS_URI_MSG_CONN = isDevNoDbEnv()
  ? ""
  : process.env.REDIS_URI_ACK || redisPrimaryUri;
