/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../../utils/logger";

export type AgentInboundJobData = {
  companyId: number;
  ticketId: number;
  whatsappId: number | string;
  promptId: number;
  wid: string;
  enqueuedAt: string;
  userText: string;
  contactId: number;
  /** whatsapp (default) | telegram | sms */
  channel?: string;
};

function cleanPart(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]+/g, "_")
    .slice(0, 160);
}

export function buildAgentInboundJobId(data: {
  companyId: number;
  ticketId: number;
  promptId: number;
  wid: string;
}): string {
  return [
    "agent-inbound",
    cleanPart(data.companyId),
    cleanPart(data.ticketId),
    cleanPart(data.promptId),
    cleanPart(data.wid)
  ].join(":");
}

export function isAgentInboundQueueEnabled(): boolean {
  const raw = String(process.env.AI_INBOUND_QUEUE_ENABLED || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

export async function enqueueAgentInboundJob(queue: any, data: AgentInboundJobData): Promise<boolean> {
  if (!queue || typeof queue.add !== "function") return false;
  const jobId = buildAgentInboundJobId(data);
  try {
    await queue.add("AgentInboundMessage", data, {
      jobId,
      removeOnComplete: true,
      attempts: 2,
      backoff: { type: "fixed", delay: 2000 }
    });
    return true;
  } catch (error: any) {
    logger.warn(`[AGENT-INBOUND-QUEUE] falha ao enfileirar job=${jobId}: ${error?.message || error}`);
    return false;
  }
}
