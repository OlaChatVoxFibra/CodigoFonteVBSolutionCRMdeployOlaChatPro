/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { BRAIN_DEFAULT_SUBTITLE } from "./constants";

export default function BrainPricingHeader({ subtitle }) {
  const text = subtitle || BRAIN_DEFAULT_SUBTITLE;

  return (
    <header className="vb-pricing__header vb-pricing__header--compact">
      <h1 id="brain-pricing-title" className="vb-pricing__brain-title">
        <span className="vb-pricing__brain-name">Brain.AI</span>
        <span className="vb-pricing__brain-label">Planos</span>
      </h1>
      <p className="vb-pricing__subtitle">{text}</p>
    </header>
  );
}
