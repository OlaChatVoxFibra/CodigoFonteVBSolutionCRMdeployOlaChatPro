/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import useBrainCredits from "../../hooks/useBrainCredits";
import { useIsDarkMode } from "../../hooks/useMediaQueryBrain";
import BrainPricingSection from "../pricing/brain";
import BrainPlansLayout from "../pricing/brain/BrainPlansLayout";

export default function BrainPlansPage({ refreshKey = 0, onCreditsUpdated }) {
  const isDark = useIsDarkMode();
  const mode = isDark ? "dark" : "light";
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  const paymentFlag = params.get("payment");

  const { status, loading, confirmPayment, fetchCredits } = useBrainCredits(refreshKey);

  useEffect(() => {
    let active = true;
    async function handleReturn() {
      if (!sessionId && paymentFlag !== "success") return;
      if (sessionId) {
        const result = await confirmPayment(sessionId);
        if (!active) return;
        if (result?.activated) {
          toast.success("Créditos Brain.AI liberados com sucesso!");
          onCreditsUpdated?.();
        } else if (paymentFlag === "success") {
          toast.info("Pagamento recebido. Os créditos serão liberados em instantes.");
          await fetchCredits();
        }
      }
    }
    handleReturn();
    return () => {
      active = false;
    };
  }, [sessionId, paymentFlag, confirmPayment, fetchCredits, onCreditsUpdated]);

  return (
    <BrainPlansLayout>
      <BrainPricingSection
        themeMode={mode}
        creditsStatus={status}
        creditsLoading={loading}
      />
    </BrainPlansLayout>
  );
}
