/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

export default function useBrainCredits(refreshKey = 0) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/ai-brain/credits");
      setStatus(data);
    } catch (err) {
      setError(err);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmPayment = useCallback(async (sessionId) => {
    if (!sessionId) return null;
    try {
      const { data } = await api.post("/ai-brain/credits/confirm-payment", {
        sessionId
      });
      if (data?.activated) {
        setStatus(data.status || status);
      }
      await fetchCredits();
      return data;
    } catch (err) {
      setError(err);
      return null;
    }
  }, [fetchCredits, status]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits, refreshKey]);

  const balance = status?.balance ?? 0;
  const quota = status?.monthlyQuota ?? 100;
  const used = status?.used ?? Math.max(0, quota - balance);
  const percentUsed = status?.percentUsed ?? (quota > 0 ? Math.round((used / quota) * 100) : 0);
  const isEmpty = balance <= 0;
  const isLow = !isEmpty && balance <= Math.max(5, Math.floor(quota * 0.2));
  const isWarning = !isEmpty && percentUsed >= 80;

  return {
    status,
    loading,
    error,
    balance,
    quota,
    used,
    percentUsed,
    isEmpty,
    isLow,
    isWarning,
    fetchCredits,
    confirmPayment
  };
}
