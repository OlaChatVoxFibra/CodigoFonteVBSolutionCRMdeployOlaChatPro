/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useContext, useState } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../../../context/Auth/AuthContext";
import api from "../../../services/api";
import {
  brainStripeInterval,
  brainStripeProductKey,
  buildStripeBrainCheckoutUrl,
} from "../../../utils/stripeCheckout";
import {
  buildStripeCancelPageUrl,
  getStripeCheckoutReturnPath,
  saveStripeCheckoutReturnPath,
} from "../../../utils/stripeCheckoutReturn";
import { BRAIN_BILLING_CYCLES, BRAIN_DEFAULT_SUBTITLE } from "./constants";

export default function useBrainPricing({ onChoose, subtitle }) {
  const [cycle, setCycle] = useState(BRAIN_BILLING_CYCLES[0]);
  const [checkingOut, setCheckingOut] = useState(null);
  const { user } = useContext(AuthContext);

  const resolvedSubtitle = subtitle || BRAIN_DEFAULT_SUBTITLE;
  const email = user?.email || user?.company?.email || "";

  const handleSelectPlan = useCallback(
    async (tier) => {
      if (typeof onChoose === "function") {
        onChoose(cycle, tier);
        return;
      }

      const productKey = brainStripeProductKey(tier);
      const interval = brainStripeInterval(cycle);
      setCheckingOut(tier);

      const returnPath = getStripeCheckoutReturnPath();
      saveStripeCheckoutReturnPath(returnPath);
      const cancelUrl = buildStripeCancelPageUrl(returnPath);

      try {
        if (productKey) {
          const { data } = await api.post("/subscription/stripe/checkout", {
            productKey,
            currency: "brl",
            interval,
            cancelUrl
          });
          if (data?.url) {
            window.location.href = data.url;
            return;
          }
        }
      } catch {
        // fallback para Payment Link direto
      }

      const fallbackUrl = buildStripeBrainCheckoutUrl(cycle, tier, email);
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return;
      }

      toast.error("Não foi possível abrir o checkout. Tente novamente.");
      setCheckingOut(null);
    },
    [cycle, email, onChoose]
  );

  return {
    cycle,
    setCycle,
    resolvedSubtitle,
    handleSelectPlan,
    checkingOut
  };
}
