/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";
import { ALL_BRAIN_MCP_IDS } from "../config/brainMcpCatalog";

function storageKey(userId) {
  return `brain-ai-mcp:${userId || "guest"}`;
}

function readStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(ALL_BRAIN_MCP_IDS);
    return parsed.filter((id) => allowed.has(id));
  } catch {
    return [];
  }
}

export default function useBrainMcpSelection(userId) {
  const [selectedMcps, setSelectedMcpsState] = useState(() => readStored(userId));

  useEffect(() => {
    setSelectedMcpsState(readStored(userId));
  }, [userId]);

  const setSelectedMcps = useCallback(
    (next) => {
      const value = Array.isArray(next) ? next : [];
      setSelectedMcpsState(value);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(value));
      } catch {
        /* ignore quota errors */
      }
    },
    [userId]
  );

  return { selectedMcps, setSelectedMcps };
}
