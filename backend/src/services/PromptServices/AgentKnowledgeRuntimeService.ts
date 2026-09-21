/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import PromptKnowledgeSource from "../../models/PromptKnowledgeSource";
import logger from "../../utils/logger";

export type AgentKnowledgeRuntime = {
  enabled: boolean;
  vectorStoreIds: string[];
  tools: Array<Record<string, unknown>>;
  sourceCount: number;
};

function flagEnabled(key: string, defaultValue: boolean): boolean {
  const raw = String(process.env[key] || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return !["0", "false", "off", "no"].includes(raw);
}

function uniqueStrings(values: unknown[]): string[] {
  return [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
}

export async function buildAgentKnowledgeRuntime(params: {
  companyId: number;
  promptId: number;
}): Promise<AgentKnowledgeRuntime> {
  if (!flagEnabled("AGENT_FILE_SEARCH_ENABLED", false)) {
    return { enabled: false, vectorStoreIds: [], tools: [], sourceCount: 0 };
  }
  try {
    const rows = await PromptKnowledgeSource.findAll({
      where: {
        companyId: params.companyId,
        promptId: params.promptId
      },
      attributes: ["id", "openAiVectorStoreId", "indexStatus"]
    });
    const readyRows = rows.filter((row: any) => String(row.indexStatus || "").toLowerCase() === "ready");
    const vectorStoreIds = uniqueStrings(readyRows.map((row: any) => row.openAiVectorStoreId));
    if (!vectorStoreIds.length) {
      return { enabled: false, vectorStoreIds: [], tools: [], sourceCount: rows.length };
    }
    return {
      enabled: true,
      vectorStoreIds,
      sourceCount: rows.length,
      tools: [
        {
          type: "file_search",
          vector_store_ids: vectorStoreIds
        }
      ]
    };
  } catch (error: any) {
    logger.warn(
      `[AGENT-KNOWLEDGE] falha ao montar file_search prompt=${params.promptId} company=${params.companyId}: ${
        error?.message || error
      }`
    );
    return { enabled: false, vectorStoreIds: [], tools: [], sourceCount: 0 };
  }
}

