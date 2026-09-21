/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { CRM_DEFAULT_SUBTITLE_LINES, CRM_DEFAULT_TITLE } from "./constants";

export default function CrmPricingHeader({ title, subtitle, compact = false }) {
  const resolvedTitle = title || CRM_DEFAULT_TITLE;
  const showDefaultBreak = !title && resolvedTitle === CRM_DEFAULT_TITLE && !compact;

  return (
    <header className={`vb-pricing__header${compact ? " vb-pricing__header--register" : " vb-pricing__header--compact"}`}>
      <div className="vb-pricing__title-row">
        <h2 id="crm-pricing-title" className="vb-pricing__title">
          {showDefaultBreak ? (
            <>
              Plano para todo tipo
              <br />
              de crescimento
            </>
          ) : compact && !title ? (
            "Escolha seu plano"
          ) : (
            resolvedTitle
          )}
        </h2>
      </div>
      {!compact ? (
        <p className="vb-pricing__subtitle">
          {!subtitle ? (
            <>
              {CRM_DEFAULT_SUBTITLE_LINES[0]}
              <br />
              {CRM_DEFAULT_SUBTITLE_LINES[1]}
            </>
          ) : (
            subtitle
          )}
        </p>
      ) : null}
    </header>
  );
}
