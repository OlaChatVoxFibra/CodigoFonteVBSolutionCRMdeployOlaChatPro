/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BRAIN_PERSONALIZATION,
  normalizeBrainPersonalization,
} from "../config/brainPersonalizationCatalog";

function storageKey(userId) {
  return `brain-ai-personalization:${userId || "guest"}`;
}

function readStored(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { ...DEFAULT_BRAIN_PERSONALIZATION };
    return normalizeBrainPersonalization(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_BRAIN_PERSONALIZATION };
  }
}

export default function useBrainPersonalization(userId) {
  const [personalization, setPersonalizationState] = useState(() => readStored(userId));

  useEffect(() => {
    setPersonalizationState(readStored(userId));
  }, [userId]);

  const setPersonalization = useCallback(
    (next) => {
      const value = normalizeBrainPersonalization(
        typeof next === "function" ? next(readStored(userId)) : next
      );
      setPersonalizationState(value);
      try {
        localStorage.setItem(storageKey(userId), JSON.stringify(value));
      } catch {
        /* ignore quota errors */
      }
    },
    [userId]
  );

  const resetPersonalization = useCallback(() => {
    setPersonalization({ ...DEFAULT_BRAIN_PERSONALIZATION });
  }, [setPersonalization]);

  return { personalization, setPersonalization, resetPersonalization };
}
