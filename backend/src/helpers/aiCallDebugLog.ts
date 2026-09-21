/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../utils/logger";
import Ticket from "../models/Ticket";

/**
 * Rastreio de chamadas ao modelo: `__line` não existe em Node/TS; use `source` estável (arquivo:função).
 */
export function logAiCallDebug(
  source: string,
  ticket: Ticket | null | undefined,
  systemPromptUsed: unknown
): void {
  logger.info(
    `[AI_CALL] source=${source} ticketId=${ticket?.id ?? "n/a"} prompt=${JSON.stringify(systemPromptUsed).slice(0, 200)}`
  );
}
