/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

export default function BrainPlansLayout({ children, className = "" }) {
  return (
    <div className={`vb-brain-plans-shell${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
