/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { openApi } from "../services/api";

export default function useStripeSubscription({ publicCatalog = false } = {}) {
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlans = useCallback(async () => {
    const client = publicCatalog ? openApi : api;
    const path = publicCatalog ? "/public/stripe/plans?type=crm" : "/subscription/stripe/plans?type=crm";
    const { data } = await client.get(path);
    setPlans(Array.isArray(data?.products) ? data.products : []);
  }, [publicCatalog]);

  const fetchStatus = useCallback(async () => {
    if (publicCatalog) return null;
    const { data } = await api.get("/subscription/stripe/status");
    setStatus(data || null);
    if (Array.isArray(data?.availablePlans)) {
      setPlans(data.availablePlans);
    }
    return data;
  }, [publicCatalog]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (publicCatalog) {
        await fetchPlans();
      } else {
        await fetchStatus();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Erro ao carregar Stripe");
    } finally {
      setLoading(false);
    }
  }, [fetchPlans, fetchStatus, publicCatalog]);

  const startCheckout = useCallback(async ({ productKey, interval = "monthly", currency = "brl", includeOnboarding = false }) => {
    const { data } = await api.post("/subscription/stripe/checkout", {
      productKey,
      interval,
      currency,
      cancelUrl: "/settings",
      includeOnboarding
    });
    if (data?.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
    return data;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    status,
    plans,
    loading,
    error,
    refresh,
    startCheckout,
    stripe: status?.stripe || null
  };
}
