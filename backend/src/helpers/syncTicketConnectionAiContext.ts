/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import {
  syncTicketConnectionAgentContext,
  ConnectionAiContextSyncResult
} from "./syncTicketConnectionAgentContext";

export type { ConnectionAiContextSyncResult };

/**
 * Compat: sincroniza contexto quando o agente da conexão é um Prompt (OpenAI/GPT ou Claude no Prompt).
 */
export async function syncTicketConnectionAiContext(
  ticket: Ticket,
  linkedPromptId: number
): Promise<ConnectionAiContextSyncResult> {
  return syncTicketConnectionAgentContext(ticket, {
    kind: "prompt",
    promptId: linkedPromptId
  });
}
