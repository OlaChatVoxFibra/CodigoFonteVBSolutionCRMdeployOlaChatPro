/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { LobeClaudeIcon } from "../../../components/LobeBrandIcon";

/** Ícone Claude (@lobehub/icons) para cartões de agente. */
export default function ClaudeAgentIcon({ size = 48 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: "rgba(217, 119, 87, 0.1)"
      }}
    >
      <LobeClaudeIcon size={Math.round(size * 0.58)} />
    </div>
  );
}
