/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function getFollowUpAfterDays(fallback?: number): number {
  const env = Number(process.env.AGENT_FOLLOWUP_AFTER_DAYS);
  if (!Number.isNaN(env) && env > 0) return env;
  if (typeof fallback === "number" && fallback > 0) return fallback;
  return 2;
}

export function getBulkDelayMs(): number {
  const env = Number(process.env.AGENT_BULK_DELAY_MS);
  if (!Number.isNaN(env) && env >= 500) return env;
  return 1500;
}

export function getColdOutreachDelayMs(): number {
  const env = Number(process.env.AGENT_COLD_OUTREACH_DELAY_MS);
  if (!Number.isNaN(env) && env >= 1000) return env;
  return 60000;
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
