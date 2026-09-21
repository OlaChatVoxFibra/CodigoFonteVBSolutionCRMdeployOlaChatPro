/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { ShieldCheck } from "lucide-react";
import { i18n } from "../../../translate/i18n";

const t = (key, fallback) => {
  const value = i18n.t(key);
  return value !== key ? value : fallback;
};

export default function CrmTrialBanner() {
  return (
    <div className="vb-pricing__trial-banner" role="note" aria-label={t("register.plans.trial.title", "14 dias gratuitos para testar")}>
      <div className="vb-pricing__trial-banner-icon" aria-hidden="true">
        <ShieldCheck size={17} strokeWidth={2.25} />
      </div>
      <div className="vb-pricing__trial-banner-text">
        <p className="vb-pricing__trial-banner-title">
          {t("register.plans.trial.title", "14 dias gratuitos para testar")}
        </p>
        <p className="vb-pricing__trial-banner-desc">
          {t(
            "register.plans.trial.description",
            "Experimente qualquer plano com risco zero. Se não atender suas expectativas em 14 dias, devolvemos 100% do investimento."
          )}
        </p>
      </div>
    </div>
  );
}
