/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

/** Wrapper leve — sem borda/sombra; só ritmo vertical para página fluida. */
export default function SectionCard({ children, style, className, ...rest }) {
  return (
    <div className={className} style={{ marginBottom: 8, ...style }} {...rest}>
      {children}
    </div>
  );
}
