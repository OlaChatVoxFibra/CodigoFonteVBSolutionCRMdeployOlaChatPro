/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";

function storageKey(userId) {
  return `brain-ai-custom-mcps:${userId || "guest"}`;
}

function readStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeMcp(mcp) {
  return {
    id: String(mcp.id || `custom-mcp-${Date.now()}`),
    name: String(mcp.name || "MCP personalizado").slice(0, 80),
    url: String(mcp.url || "").slice(0, 500),
    description: String(mcp.description || "").slice(0, 500),
    enabled: mcp.enabled !== false,
  };
}

export default function useBrainCustomMcps(userId) {
  const [customMcps, setCustomMcpsState] = useState(() => readStored(userId));

  useEffect(() => {
    setCustomMcpsState(readStored(userId));
  }, [userId]);

  const persist = useCallback(
    (next) => {
      setCustomMcpsState(next);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [userId]
  );

  const addCustomMcp = useCallback(
    (partial = {}) => {
      const mcp = normalizeMcp({
        id: `custom-mcp-${Date.now()}`,
        ...partial,
      });
      persist([mcp, ...readStored(userId)]);
      return mcp;
    },
    [persist, userId]
  );

  const updateCustomMcp = useCallback(
    (id, patch) => {
      const next = readStored(userId).map((m) =>
        m.id === id ? normalizeMcp({ ...m, ...patch }) : m
      );
      persist(next);
    },
    [persist, userId]
  );

  const removeCustomMcp = useCallback(
    (id) => {
      persist(readStored(userId).filter((m) => m.id !== id));
    },
    [persist, userId]
  );

  const toggleCustomMcp = useCallback(
    (id) => {
      const next = readStored(userId).map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      );
      persist(next);
    },
    [persist, userId]
  );

  return { customMcps, addCustomMcp, updateCustomMcp, removeCustomMcp, toggleCustomMcp };
}
